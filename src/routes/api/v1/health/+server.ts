import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { s3 } from '$lib/server/security/s3';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { getVectorStore } from '$lib/server/vectors';

/**
 * Health Endpoint
 * Checks if the node is alive and can reach its primary dependencies.
 */
export const GET: RequestHandler = async () => {
    const health: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {
            database: 'unknown',
            storage: 'unknown',
            vectors: 'unknown'
        }
    };

    try {
        // 1. Check Database (Simple query)
        await db.query.users.findFirst();
        health.checks.database = 'ok';
    } catch (err: any) {
        health.status = 'error';
        health.checks.database = `error: ${err.message}`;
    }

    try {
        // 2. Check S3 Storage (HeadBucket on a mandatory bucket)
        await s3.send(new HeadBucketCommand({ Bucket: 'hrag-raw' }));
        health.checks.storage = 'ok';
    } catch (err: any) {
        health.status = 'error';
        health.checks.storage = `error: ${err.message}`;
    }

    try {
        // 3. Check Vector Store
        const store = await getVectorStore();
        await store.initialize();
        health.checks.vectors = 'ok';
    } catch (err: any) {
        health.status = 'error';
        health.checks.vectors = `error: ${err.message}`;
    }

    return json(health, { status: health.status === 'ok' ? 200 : 503 });
};
