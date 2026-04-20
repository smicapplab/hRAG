import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { getJwtSecret } from '$lib/server/security/vault';
import crypto from 'node:crypto';

export const actions = {
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

        // 3. Issue Token
        const secret = new TextEncoder().encode(getJwtSecret());
        const token = await new SignJWT({ 
            sub: user.id, 
            email: user.email, 
            isAdmin: user.isAdmin, 
            isCompliance: user.isCompliance 
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        // 4. Set Secure Cookie
        cookies.set('jwt', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        throw redirect(302, '/chat');
    },

    logout: async ({ cookies }) => {
        cookies.delete('jwt', { path: '/' });
        throw redirect(302, '/login');
    }
};
