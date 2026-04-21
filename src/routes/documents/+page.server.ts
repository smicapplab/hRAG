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

    try {
        // Iron-Clad Privacy Scoping: 
        // 1. Fetch IDs of documents shared specifically with this user via document_permissions
        const sharedDocs = await db.select({ documentId: schema.documentPermissions.documentId })
            .from(schema.documentPermissions)
            .where(eq(schema.documentPermissions.userId, userId));
        
        const sharedIds = sharedDocs.map(d => d.documentId);

        // 2. Query documents matching any of the authorized conditions
        const userDocs = await db.query.documents.findMany({
            where: (doc, { eq, or, inArray }) => or(
                eq(doc.ownerId, userId),
                eq(doc.classification, 'PUBLIC'),
                groupIds.length > 0 ? inArray(doc.groupId, groupIds) : undefined,
                sharedIds.length > 0 ? inArray(doc.id, sharedIds) : undefined
            ),
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
