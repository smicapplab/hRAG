import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';
import crypto from 'node:crypto';

/**
 * Tag Management API
 * Allows authorized users to add or remove tags from a document.
 */

async function getDocAndCheckAccess(docId: string, user: any) {
    const doc = await db.query.documents.findFirst({
        where: eq(schema.documents.id, docId)
    });

    if (!doc) return { error: 'Document not found', status: 404 };

    // Ownership check
    if (doc.ownerId === user.id) return { doc, canEdit: true };

    // Group role check
    if (doc.groupId) {
        const userRole = user.groupRoles[doc.groupId] as Role;
        if (userRole && ROLE_WEIGHT[userRole] >= ROLE_WEIGHT.EDITOR) {
            return { doc, canEdit: true };
        }
    }

    // Admins can edit everything
    if (user.isAdmin) return { doc, canEdit: true };

    return { error: 'Forbidden', status: 403 };
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id: docId } = params;
    const { doc, canEdit, error, status } = await getDocAndCheckAccess(docId, locals.user);

    if (error) return json({ error }, { status });
    if (!canEdit) return json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { tagName } = await request.json();
        if (!tagName || typeof tagName !== 'string') {
            return json({ error: 'Invalid tag name' }, { status: 400 });
        }

        const normalizedTagName = tagName.trim().toUpperCase();

        // 1. Ensure tag exists
        let tagRecord = await db.query.tags.findFirst({
            where: eq(schema.tags.name, normalizedTagName)
        });

        if (!tagRecord) {
            // GOVERNANCE: Only Admins or Managers can create new canonical tags
            const isPrivileged = locals.user.isAdmin || (doc.groupId && locals.user.groupRoles[doc.groupId] === 'MANAGER');
            
            if (!isPrivileged) {
                return json({ 
                    error: 'Taxonomy Governance: Only Admins or Managers can create new taxonomy labels. Please select from existing tags.' 
                }, { status: 403 });
            }

            [tagRecord] = await db.insert(schema.tags).values({
                id: crypto.randomUUID(),
                name: normalizedTagName,
                isAiGenerated: false
            }).returning();
        }

        // 2. Associate with document
        await db.insert(schema.documentsToTags).values({
            documentId: docId,
            tagId: tagRecord.id
        }).onConflictDoNothing();

        // 3. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'TAG_ASSOCIATION_ADDED',
            metadata: JSON.stringify({ docId, tagName: normalizedTagName })
        });

        return json({ success: true, tag: tagRecord });
    } catch (err: any) {
        console.error('[API] Error adding tag:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id: docId } = params;
    const { doc, canEdit, error, status } = await getDocAndCheckAccess(docId, locals.user);

    if (error) return json({ error }, { status });
    if (!canEdit) return json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { tagName } = await request.json();
        if (!tagName) return json({ error: 'Invalid tag name' }, { status: 400 });

        const normalizedTagName = tagName.trim().toUpperCase();

        const tagRecord = await db.query.tags.findFirst({
            where: eq(schema.tags.name, normalizedTagName)
        });

        if (!tagRecord) return json({ error: 'Tag not found' }, { status: 404 });

        // 2. Remove association
        await db.delete(schema.documentsToTags)
            .where(and(
                eq(schema.documentsToTags.documentId, docId),
                eq(schema.documentsToTags.tagId, tagRecord.id)
            ));

        // 3. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'TAG_ASSOCIATION_REMOVED',
            metadata: JSON.stringify({ docId, tagName: normalizedTagName })
        });

        return json({ success: true });
    } catch (err: any) {
        console.error('[API] Error removing tag:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
