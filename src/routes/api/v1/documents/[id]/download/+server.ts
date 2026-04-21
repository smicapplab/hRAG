import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, and, inArray, exists } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/security/s3';

export const GET: RequestHandler = async ({ params, locals }) => {
    // 1. Authenticate Request
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const { id: userId, groupIds } = locals.user;
    const docId = params.id;

    try {
        // 2. Iron-Clad Security: Defense-in-Depth Relational Verification
        // Issue URL ONLY if the user has explicit permission or ownership.
        const [doc] = await db.select()
            .from(schema.documents)
            .where(
                and(
                    eq(schema.documents.id, docId),
                    or(
                        eq(schema.documents.ownerId, userId),
                        eq(schema.documents.classification, 'PUBLIC'),
                        groupIds.length > 0 ? inArray(schema.documents.groupId, groupIds) : undefined,
                        exists(
                            db.select()
                                .from(schema.documentPermissions)
                                .where(and(
                                    eq(schema.documentPermissions.documentId, schema.documents.id),
                                    eq(schema.documentPermissions.userId, userId)
                                ))
                        )
                    )
                )
            );

        if (!doc) {
            throw error(404, 'Document not found or access denied');
        }

        // 3. Generate Pre-signed 60s TTL URL
        // Bucket is always hrag-raw for document storage
        const downloadUrl = await getSignedDownloadUrl('hrag-raw', doc.s3Key, 60);

        // 4. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'DOCUMENT_DOWNLOAD_PRE_SIGNED_URL_GENERATED',
            metadata: JSON.stringify({ docId: doc.id, fileName: doc.name })
        });

        // 5. Redirect to S3
        throw redirect(303, downloadUrl);

    } catch (err: any) {
        if (err.status) throw err;
        console.error('[API] Download error:', err);
        throw error(500, 'Failed to generate download link');
    }
};
