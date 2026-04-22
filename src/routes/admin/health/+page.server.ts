import { db } from '$lib/server/db';
import { nodeHeartbeats } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const nodes = await db.select().from(nodeHeartbeats).orderBy(desc(nodeHeartbeats.lastSeen));
    
    return {
        nodes: nodes.map(n => ({
            ...n,
            metrics: JSON.parse(n.metrics)
        }))
    };
};
