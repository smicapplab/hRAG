import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { getJwtSecret } from '$lib/server/security/vault';
import { resolveEffectiveAccess } from '$lib/server/auth/roles';
import crypto from 'node:crypto';

import type { Actions } from './$types';

export const actions: Actions = {
    login: async ({ request, cookies }) => {
        const data = await request.formData();
        const email = data.get('email') as string;
        const password = data.get('password') as string;

        if (!email || !password) {
            return fail(400, { message: 'Missing identity or secret' });
        }

        // 1. Verify Identity
        const user = await db.query.users.findFirst({ 
            where: eq(users.email, email) 
        });

        if (!user) {
            // Constant time-ish delay or generic message for security
            return fail(401, { message: 'Invalid credentials' });
        }

        // 2. Verify Secret (SHA-256 for now as per seed)
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== user.passwordHash) {
            return fail(401, { message: 'Invalid credentials' });
        }

        // 3. Resolve Effective Permissions (Iron-Clad Bridge)
        const effectiveRoles = await resolveEffectiveAccess(user.id);
        const groupIds = Object.keys(effectiveRoles);

        // 4. Issue Token
        const secret = new TextEncoder().encode(getJwtSecret());
        const token = await new SignJWT({ 
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

        // 5. Set Secure Cookie
        cookies.set('jwt', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hour session
        });

        throw redirect(302, '/chat');
    },

    logout: async ({ cookies }) => {
        cookies.delete('jwt', { path: '/' });
        throw redirect(302, '/login');
    }
};
