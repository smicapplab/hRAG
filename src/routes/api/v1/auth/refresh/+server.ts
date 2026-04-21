import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret } from '$lib/server/security/vault';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { resolveEffectiveAccess } from '$lib/server/auth/roles';

/**
 * Token Refresh Endpoint (The Gate)
 * 
 * Validates the current JWT's tokenVersion against the source-of-truth database.
 * If the version matches, a new JWT is issued with updated effective permissions.
 * If the version has been incremented (revoked), the user is forced to re-login.
 */
export const POST: RequestHandler = async ({ cookies, locals }) => {
    const token = cookies.get('jwt');
    if (!token) {
        throw error(401, 'Session expired');
    }

    try {
        const secret = new TextEncoder().encode(getJwtSecret());
        const { payload } = await jwtVerify(token, secret);
        const userId = payload.sub as string;
        const jwtVersion = (payload.tokenVersion as number) || 0;

        // 1. Validate tokenVersion against DB (The stateful check)
        const user = await db.query.users.findFirst({
            where: eq(schema.users.id, userId)
        });

        if (!user || user.tokenVersion !== jwtVersion) {
            // High-Priority Audit Log for potential session hijacking or revoked access
            await db.insert(schema.auditLogs).values({
                userId: userId || 'unknown',
                event: 'SESSION_REVOKED_VERSION_MISMATCH',
                metadata: JSON.stringify({ jwtVersion, dbVersion: user?.tokenVersion })
            }).catch(() => {});

            cookies.delete('jwt', { path: '/' });
            throw error(401, 'Session revoked. Please log in again.');
        }

        // 2. Re-resolve Effective Permissions (Hierarchy Sync)
        const effectiveRoles = await resolveEffectiveAccess(user.id);
        const groupIds = Object.keys(effectiveRoles);

        // 3. Issue New JWT
        const newToken = await new SignJWT({
            sub: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            isCompliance: user.isCompliance,
            tokenVersion: user.tokenVersion,
            groups: groupIds,
            roles: effectiveRoles
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('15m') // 15 minute access token for rapid revocation
            .sign(secret);

        // 4. Update Secure Cookie
        cookies.set('jwt', newToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hour session
        });

        return json({ success: true });

    } catch (err: any) {
        if (err.status) throw err;
        console.error('[Auth] Refresh failure:', err);
        cookies.delete('jwt', { path: '/' });
        throw error(401, 'Invalid session');
    }
};
