import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const { id: userId, groupIds } = locals.user;

    // Iron-Clad Privacy Scoping: 
    // WHERE (owner_id = user_id OR group_id IN (group_ids) OR classification = 'PUBLIC')
    
    // Prepare the OR conditions
    const conditions = [
        eq(schema.documents.ownerId, userId),
        eq(schema.documents.classification, 'PUBLIC')
    ];

    if (groupIds && groupIds.length > 0) {
        conditions.push(inArray(schema.documents.groupId, groupIds));
    }

    try {
        const userDocs = await db.query.documents.findMany({
            where: or(...conditions),
            orderBy: (docs, { desc }) => [desc(docs.createdAt)]
        });

        return {
            documents: userDocs
        };
    } catch (err) {
        console.error("Error loading documents:", err);
        return {
            documents: []
        };
    }
};
