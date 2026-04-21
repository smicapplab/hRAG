import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getJwtSecret } from '$lib/server/security/vault';

/**
 * Readiness Endpoint
 * 
 * Returns 200 ONLY after:
 * 1. Dependency checks (Health) are passing.
 * 2. Security Bootstrap is complete (JWT secret is in memory).
 * 
 * Used by Nginx/Load Balancers to delay traffic until node is fully bootstrapped.
 */
export const GET: RequestHandler = async ({ fetch }) => {
    try {
        // 1. Check Health (Internal sub-request)
        const healthRes = await fetch('/api/v1/health');
        if (!healthRes.ok) {
            return json({ ready: false, reason: 'Health checks failed', details: await healthRes.json() }, { status: 503 });
        }

        // 2. Check Security Bootstrap (Secret Recovery)
        try {
            getJwtSecret();
        } catch (err: any) {
            return json({ 
                ready: false, 
                reason: 'Security Bootstrap pending', 
                message: 'Master passphrase or S3 secret recovery is not yet complete.' 
            }, { status: 503 });
        }

        return json({ 
            ready: true, 
            status: 'operational',
            timestamp: new Date().toISOString()
        });

    } catch (err: any) {
        return json({ ready: false, reason: 'Readiness check error', message: err.message }, { status: 500 });
    }
};
