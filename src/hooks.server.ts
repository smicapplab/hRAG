import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { decrypt, deriveKey } from '$lib/server/security/crypto';
import { fetchSecretBlob } from '$lib/server/security/s3';
import { setJwtSecret, getJwtSecret } from '$lib/server/security/vault';
import * as dotenv from 'dotenv';

if (typeof process !== 'undefined') {
    dotenv.config();
}

/**
 * hRAG Boot Loader
 * Standardizes the "Strict Boot-Sync" sequence to recover secrets from S3.
 */
async function bootstrap() {
    console.log('------------------------------------------------');
    console.log('hRAG CONTROL ROOM: SECURITY BOOTSTRAP');
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
        console.log('------------------------------------------------');
    } catch (err: any) {
        console.error('[!] FATAL: Security bootstrap failed:', err.message);
        process.exit(1);
    }
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
            event.locals.user = {
                id: payload.sub as string,
                email: payload.email as string,
                name: payload.name as string,
                isAdmin: payload.isAdmin as boolean,
                isCompliance: payload.isCompliance as boolean
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
