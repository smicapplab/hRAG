import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { decrypt, deriveKey } from '$lib/server/security/crypto';
import { fetchSecretBlob } from '$lib/server/security/s3';
import { setJwtSecret, getJwtSecret } from '$lib/server/security/vault';
import { db } from '$lib/server/db';
import { nodeHeartbeats } from '$lib/server/db/schema';
import * as dotenv from 'dotenv';
import os from 'os';

if (typeof process !== 'undefined') {
    dotenv.config();
}

const nodeId = `${os.hostname()}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * hRAG Boot Loader
 * Standardizes the "Strict Boot-Sync" sequence to recover secrets from S3.
 */
async function bootstrap() {
    console.log('------------------------------------------------');
    console.log('hRAG CONTROL ROOM: SECURITY BOOTSTRAP');
    console.log('Node ID:', nodeId);
    console.log('------------------------------------------------');

    const passphrase = process.env.HRAG_MASTER_PASSPHRASE;
    if (!passphrase) {
        console.error('[!] FATAL: HRAG_MASTER_PASSPHRASE is missing from environment.');
        process.exit(1);
    }

    try {
        console.log('[-] Retrieving secure blob from Garage S3...');
        const blob = await fetchSecretBlob();
        
        if (!blob) {
            console.error('[!] FATAL: JWT secret blob not found in S3 (hrag-system/secrets/jwt.enc).');
            console.error('[i] Run installation or setup script to initialize secrets.');
            process.exit(1);
        }

        console.log('[-] Decrypting JWT secret material...');
        const secret = await decrypt(blob, passphrase);
        
        setJwtSecret(secret);
        console.log('[+] Security chain established. Node is operational.');

        // Start Node Heartbeat Loop
        startHeartbeatLoop();
        console.log('[+] Heartbeat monitoring active (60s interval).');
        console.log('------------------------------------------------');
    } catch (err: any) {
        console.error('[!] FATAL: Security bootstrap failed:', err.message);
        process.exit(1);
    }
}

/**
 * Reports node health and identity to the shared registry.
 */
async function startHeartbeatLoop() {
    const isPrimary = process.env.HRAG_PRIMARY === 'true';
    
    const sendHeartbeat = async () => {
        try {
            const metrics = {
                cpu: os.loadavg()[0],
                memory: 1 - (os.freemem() / os.totalmem()),
                uptime: os.uptime()
            };

            await db.insert(nodeHeartbeats)
                .values({
                    nodeId,
                    hostname: os.hostname(),
                    isPrimary,
                    metrics: JSON.stringify(metrics),
                    lastSeen: new Date()
                })
                .onConflictDoUpdate({
                    target: nodeHeartbeats.nodeId,
                    set: {
                        metrics: JSON.stringify(metrics),
                        lastSeen: new Date()
                    }
                });
        } catch (err) {
            console.error('[!] Heartbeat failure:', err);
        }
    };

    // Initial heartbeat
    await sendHeartbeat();
    
    // 60-second loop
    setInterval(sendHeartbeat, 60 * 1000);
}

// Execute bootstrap on server start (module level execution in hooks.server.ts)
// This runs once when the server starts.
if (process.env.NODE_ENV !== 'test') {
    bootstrap();
}

/**
 * Auth Middleware
 * Enforces "Iron-Clad" isolation and the "Authorization Sandwich".
 */
export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('jwt');

    // Layer 1: Identity Extraction
    if (token) {
        try {
            const secret = new TextEncoder().encode(getJwtSecret());
            const { payload } = await jwtVerify(token, secret);
            
            // Populate locals with identity for Layer 2 & 3
            // Spec: tokenVersion is validated ONLY at the /refresh endpoint to preserve statelessness here
            event.locals.user = {
                id: payload.sub as string,
                email: payload.email as string,
                name: payload.name as string,
                isAdmin: payload.isAdmin as boolean,
                isCompliance: payload.isCompliance as boolean,
                groupIds: (payload.groups as string[]) || [],
                groupRoles: (payload.roles as any) || {},
                tokenVersion: (payload.tokenVersion as number) || 1
            };
        } catch (err) {
            // Invalid or expired token
            event.cookies.delete('jwt', { path: '/' });
        }
    }

    // Protection: Redirect unauthenticated users
    const isPublic = 
        event.url.pathname === '/login' || 
        event.url.pathname.startsWith('/api/health') ||
        event.url.pathname.startsWith('/api/ready');

    if (!event.locals.user && !isPublic) {
        return Response.redirect(`${event.url.origin}/login`, 302);
    }

    return resolve(event);
};
