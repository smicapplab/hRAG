import { db } from '$lib/server/db';
import { tags } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // 1. Guard: Only authenticated users
    if (!locals.user) return { tags: [] };

    try {
        // 2. Fetch all unique tags for the discovery cloud
        // In a real multi-tenant scenario, we would join with documents/permissions
        const allTags = await db.query.tags.findMany({
            orderBy: (t, { asc }) => [asc(t.name)]
        });

        return {
            tags: allTags
        };
    } catch (err) {
        console.error('[Search] Failed to load tags:', err);
        return { tags: [] };
    }
};
