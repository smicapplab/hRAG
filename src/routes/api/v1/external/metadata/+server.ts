import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';
import crypto from 'node:crypto';

/**
 * External Metadata Sync API
 * Allows authorized agents to update document classification, tags, and AI insights.
 */

async function checkEditAccess(docId: string, user: any) {
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

export const PATCH: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { docId, classification, tags, aiClassification, aiOverride, reviewStatus } = body;

        if (!docId) return json({ error: 'Missing docId' }, { status: 400 });

        const { doc, canEdit, error, status } = await checkEditAccess(docId, locals.user);
        if (error) return json({ error }, { status });
        if (!canEdit) return json({ error: 'Forbidden' }, { status: 403 });

        // 1. Update document metadata
        const updateData: any = { updatedAt: new Date() };
        if (classification) updateData.classification = classification;
        if (aiClassification) updateData.aiClassification = aiClassification;
        if (aiOverride !== undefined) updateData.aiOverride = aiOverride;
        if (reviewStatus) updateData.reviewStatus = reviewStatus;

        await db.update(schema.documents)
            .set(updateData)
            .where(eq(schema.documents.id, docId));

        // 2. Update tags if provided
        if (Array.isArray(tags)) {
            // Remove existing associations
            await db.delete(schema.documentsToTags)
                .where(eq(schema.documentsToTags.documentId, docId));

            for (const tagName of tags) {
                const normalized = tagName.trim().toUpperCase();
                
                // Ensure tag exists
                let tagRecord = await db.query.tags.findFirst({
                    where: eq(schema.tags.name, normalized)
                });

                if (!tagRecord) {
                    [tagRecord] = await db.insert(schema.tags).values({
                        id: crypto.randomUUID(),
                        name: normalized,
                        isAiGenerated: true // Default to AI generated for external syncs
                    }).returning();
                }

                // Associate
                await db.insert(schema.documentsToTags).values({
                    documentId: docId,
                    tagId: tagRecord.id
                }).onConflictDoNothing();
            }
        }

        // 3. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'EXTERNAL_METADATA_SYNC',
            metadata: JSON.stringify({ 
                docId, 
                fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt'),
                tagsUpdated: !!tags
            })
        });

        return json({ success: true });
    } catch (err: any) {
        console.error('[API] External Metadata Sync Error:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
