import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { nodeHeartbeats } from '$lib/server/db/schema';
import { count, gt } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
    // Check for active nodes in the last 2 minutes
    let isSingleNode = true;
    try {
        const activeNodes = await db.select({ value: count() })
            .from(nodeHeartbeats)
            .where(gt(nodeHeartbeats.lastSeen, new Date(Date.now() - 120 * 1000)));
        isSingleNode = activeNodes[0].value <= 1;
    } catch (err) {
        console.error('Failed to fetch node heartbeats:', err);
    }

    return {
        user: locals.user,
        isSingleNode
    };
};
