import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { s3 } from '$lib/server/security/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { eq, and } from 'drizzle-orm';
import { getVectorStore } from '$lib/server/vectors';

export const DELETE: RequestHandler = async ({ params, locals }) => {
    // 1. Authenticate Request
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: docId } = params;
    const userId = locals.user.id;

    try {
        // 2. Fetch document to verify ownership and get S3 key
        const doc = await db.query.documents.findFirst({
            where: and(
                eq(schema.documents.id, docId),
                eq(schema.documents.ownerId, userId)
            )
        });

        if (!doc) {
            return json({ error: 'Document not found or access denied' }, { status: 404 });
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
            .where(and(
                eq(schema.documents.id, docId),
                eq(schema.documents.ownerId, userId)
            ));

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
