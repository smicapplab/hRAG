import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';
import { getVectorStore } from '$lib/server/vectors';

/**
 * Document Sharing API
 * Allows owners or group editors to grant access to specific users.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id: docId } = params;
    const { email, groupId, permission, action = 'GRANT' } = await request.json();

    if (action === 'GRANT' && !email && !groupId) {
        return json({ error: 'Recipient email or groupId is required.' }, { status: 400 });
    }

    try {
        // 1. Fetch document and check access
        const doc = await db.query.documents.findFirst({
            where: eq(schema.documents.id, docId)
        });

        if (!doc) return json({ error: 'Document not found' }, { status: 404 });

        const isOwner = doc.ownerId === locals.user.id;
        let canShare = isOwner || locals.user.isAdmin;

        if (!canShare && doc.groupId) {
            const role = locals.user.groupRoles[doc.groupId] as Role;
            if (role && ROLE_WEIGHT[role] >= ROLE_WEIGHT.EDITOR) {
                canShare = true;
            }
        }

        if (!canShare) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }

        if (action === 'GRANT') {
            if (groupId) {
                // Group Sharing
                await db.update(schema.documents).set({ groupId }).where(eq(schema.documents.id, docId));
            } else {
                // User Sharing
                const recipient = await db.query.users.findFirst({
                    where: eq(schema.users.email, email.trim().toLowerCase())
                });

                if (!recipient) return json({ error: 'Recipient user not found.' }, { status: 404 });

                await db.insert(schema.documentPermissions).values({
                    documentId: docId,
                    userId: recipient.id,
                    permission: permission.toUpperCase() as 'VIEW' | 'EDIT'
                }).onConflictDoUpdate({
                    target: [schema.documentPermissions.documentId, schema.documentPermissions.userId],
                    set: { permission: permission.toUpperCase() as 'VIEW' | 'EDIT' }
                });
            }
        } else if (action === 'REVOKE') {
            if (email) {
                 const recipient = await db.query.users.findFirst({
                    where: eq(schema.users.email, email.trim().toLowerCase())
                });
                if (recipient) {
                    await db.delete(schema.documentPermissions).where(and(
                        eq(schema.documentPermissions.documentId, docId),
                        eq(schema.documentPermissions.userId, recipient.id)
                    ));
                }
            }
        }

        // 2. Propagate to Vector Store (Defense-in-Depth)
        const vectorStore = await getVectorStore();
        
        // Re-read doc to get updated groupId if changed
        const updatedDoc = await db.query.documents.findFirst({
            where: eq(schema.documents.id, docId)
        });

        const currentPerms = await db.query.documentPermissions.findMany({
            where: eq(schema.documentPermissions.documentId, docId)
        });

        const accessIds = [`u:${doc.ownerId}`];
        if (updatedDoc?.classification === 'PUBLIC') accessIds.push('r:global');
        if (updatedDoc?.groupId) accessIds.push(`g:${updatedDoc.groupId}`);
        
        for (const p of currentPerms) {
            accessIds.push(`u:${p.userId}`);
        }

        await vectorStore.updateAccess(docId, [...new Set(accessIds)]);

        return json({ success: true });
    } catch (err: any) {
        console.error('[API] Sharing error:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
