import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { s3 } from '$lib/server/security/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { eq, and } from 'drizzle-orm';
import { getVectorStore } from '$lib/server/vectors';

import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id: docId } = params;
    
    try {
        const doc = await db.query.documents.findFirst({
            where: eq(schema.documents.id, docId),
            with: {
                permissions: {
                    where: eq(schema.documentPermissions.userId, locals.user.id)
                }
            }
        });

        if (!doc) return json({ error: 'Not Found' }, { status: 404 });

        // Basic read check
        const isOwner = doc.ownerId === locals.user.id;
        const inGroup = doc.groupId && locals.user.groupIds.includes(doc.groupId);
        const hasDirectPerm = doc.permissions.length > 0;
        const isPublic = doc.classification === 'PUBLIC';

        if (!isOwner && !inGroup && !hasDirectPerm && !isPublic && !locals.user.isAdmin) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }

        return json({ document: doc });
    } catch (err) {
        return json({ error: 'Internal Error' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    const { id: docId } = params;
    const { classification, groupId } = await request.json();

    try {
        const doc = await db.query.documents.findFirst({
            where: eq(schema.documents.id, docId)
        });

        if (!doc) return json({ error: 'Not Found' }, { status: 404 });

        // Check update permission (Owner, Admin, or Group Manager)
        const isOwner = doc.ownerId === locals.user.id;
        let canUpdate = isOwner || locals.user.isAdmin;
        
        if (!canUpdate && doc.groupId) {
            const role = locals.user.groupRoles[doc.groupId] as Role;
            if (role && ROLE_WEIGHT[role] >= ROLE_WEIGHT.MANAGER) {
                canUpdate = true;
            }
        }

        if (!canUpdate) return json({ error: 'Forbidden' }, { status: 403 });

        const updates: any = {};
        if (classification) updates.classification = classification;
        if (groupId !== undefined) updates.groupId = groupId;

        await db.update(schema.documents).set(updates).where(eq(schema.documents.id, docId));

        // Audit update
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'DOCUMENT_METADATA_UPDATED',
            metadata: JSON.stringify({ docId, updates })
        });

        return json({ success: true });
    } catch (err) {
        return json({ error: 'Update Failed' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    // 1. Authenticate Request
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: docId } = params;
    const userId = locals.user.id;

    try {
        // 2. Fetch document to verify access and get S3 key
        const doc = await db.query.documents.findFirst({
            where: eq(schema.documents.id, docId)
        });

        if (!doc) {
            return json({ error: 'Document not found' }, { status: 404 });
        }

        // Verify Delete Permission (Owner, Admin, or Group Manager)
        const isOwner = doc.ownerId === userId;
        let canDelete = isOwner || locals.user.isAdmin;

        if (!canDelete && doc.groupId) {
            const role = locals.user.groupRoles[doc.groupId] as Role;
            if (role && ROLE_WEIGHT[role] >= ROLE_WEIGHT.MANAGER) {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return json({ error: 'Forbidden: You do not have permission to purge this fragment.' }, { status: 403 });
        }

        // 3. Delete from S3 (Raw file)
        const bucket = 'hrag-raw';
        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: doc.s3Key
            }));
        } catch (s3Err) {
            console.error('[API] Failed to delete from S3:', s3Err);
            // We continue anyway to ensure metadata/vectors are cleaned up
        }

        // 4. Delete from Vector Store
        try {
            const vectorStore = await getVectorStore();
            await vectorStore.deleteDocuments([docId]);
        } catch (vectorErr) {
            console.error('[API] Failed to delete vectors:', vectorErr);
        }

        // 5. Delete from Relational Database (SQLite)
        await db.delete(schema.documents)
            .where(eq(schema.documents.id, docId));

        // 6. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: userId,
            event: 'DOCUMENT_DELETED',
            metadata: JSON.stringify({ docId, fileName: doc.name })
        }).catch(err => console.error("Failed to log delete audit:", err));

        return json({ success: true });
    } catch (err: any) {
        console.error('[API] Error deleting document:', err);
        return json({ error: 'Failed to delete document' }, { status: 500 });
    }
};
