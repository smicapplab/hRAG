import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const { id: docId } = params;
    const { id: userId, groupIds } = locals.user;

    // 1. Fetch Document with basic access check
    const doc = await db.query.documents.findFirst({
        where: eq(schema.documents.id, docId)
    });

    if (!doc) throw error(404, 'Document not found');

    // 2. Iron-Clad Security Check
    const isOwner = doc.ownerId === userId;
    const isPublic = doc.classification === 'PUBLIC';
    const inGroup = doc.groupId && groupIds.includes(doc.groupId);
    
    // Check if specifically shared with this user
    const sharedPerm = await db.query.documentPermissions.findFirst({
        where: and(
            eq(schema.documentPermissions.documentId, docId),
            eq(schema.documentPermissions.userId, userId)
        )
    });

    if (!isOwner && !isPublic && !inGroup && !sharedPerm && !locals.user.isAdmin) {
        throw error(403, 'Forbidden: You do not have access to this intelligence fragment.');
    }

    // 3. Resolve permissions for editing
    let canEdit = isOwner || locals.user.isAdmin;
    if (!canEdit && doc.groupId) {
        const role = locals.user.groupRoles[doc.groupId] as Role;
        if (role && ROLE_WEIGHT[role] >= ROLE_WEIGHT.EDITOR) {
            canEdit = true;
        }
    }

    // 4. Fetch associated tags
    const activeTags = await db.select({
        id: schema.tags.id,
        name: schema.tags.name,
        color: schema.tags.color,
        isAiGenerated: schema.tags.isAiGenerated
    })
    .from(schema.documentsToTags)
    .innerJoin(schema.tags, eq(schema.documentsToTags.tagId, schema.tags.id))
    .where(eq(schema.documentsToTags.documentId, docId));

    // 5. Fetch other system tags for suggestions
    const activeTagIds = activeTags.map(t => t.id);
    const suggestedTags = await db.query.tags.findMany({
        where: (tags, { not, inArray }) => activeTagIds.length > 0 
            ? not(inArray(tags.id, activeTagIds)) 
            : undefined,
        limit: 10
    });

    // 6. Fetch uploader info
    const uploader = await db.query.users.findFirst({
        where: eq(schema.users.id, doc.ownerId),
        columns: { name: true, email: true }
    });

    // 7. Fetch group info
    const group = doc.groupId ? await db.query.groups.findFirst({
        where: eq(schema.groups.id, doc.groupId),
        columns: { name: true }
    }) : null;

    return {
        document: {
            ...doc,
            uploader: uploader?.name || 'Unknown',
            groupName: group?.name || 'Private / Personal'
        },
        activeTags,
        suggestedTags: suggestedTags || [],
        canEdit,
        isOwner
    };
};
