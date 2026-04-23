import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // 1. Guard: Only authenticated users
    if (!locals.user) return { tags: [] };

    const { id: userId, groupIds = [] } = locals.user;

    try {
        // 2. Fetch documents shared directly with the user (Direct Permissions)
        const sharedDocs = await db.select({ id: schema.documentPermissions.documentId })
            .from(schema.documentPermissions)
            .where(eq(schema.documentPermissions.userId, userId));
        
        const sharedDocIds = sharedDocs.map(d => d.id);

        // 3. Fetch tags associated with documents the user can actually see (Privacy-by-Default)
        // GEMINI.md mandate: Mandatory filtering using "Unified ACL" logic
        const authorizedTags = await db.selectDistinct({ 
            id: schema.tags.id, 
            name: schema.tags.name 
        })
        .from(schema.tags)
        .innerJoin(schema.documentsToTags, eq(schema.tags.id, schema.documentsToTags.tagId))
        .innerJoin(schema.documents, eq(schema.documentsToTags.documentId, schema.documents.id))
        .where(or(
            eq(schema.documents.ownerId, userId),
            eq(schema.documents.classification, 'PUBLIC'),
            groupIds.length > 0 ? inArray(schema.documents.groupId, groupIds) : undefined,
            sharedDocIds.length > 0 ? inArray(schema.documents.id, sharedDocIds) : undefined
        ))
        .orderBy(schema.tags.name);

        return {
            tags: authorizedTags
        };
    } catch (err) {
        console.error('[Search] Failed to load authorized tags:', err);
        return { tags: [] };
    }
};
