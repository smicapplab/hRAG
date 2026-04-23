import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || !locals.user.isAdmin) {
        throw error(403, 'Forbidden: Admin access required.');
    }

    try {
        // Fetch all tags with their document counts
        const allTags = await db.select({
            id: schema.tags.id,
            name: schema.tags.name,
            color: schema.tags.color,
            isAiGenerated: schema.tags.isAiGenerated,
            docCount: sql<number>`count(${schema.documentsToTags.documentId})`
        })
        .from(schema.tags)
        .leftJoin(schema.documentsToTags, sql`${schema.tags.id} = ${schema.documentsToTags.tagId}`)
        .groupBy(schema.tags.id)
        .orderBy(schema.tags.name);

        return {
            allTags
        };
    } catch (err) {
        console.error('[Admin] Failed to load taxonomy:', err);
        return { allTags: [] };
    }
};
