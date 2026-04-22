import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, and, inArray, exists } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/security/s3';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';

export const GET: RequestHandler = async ({ params, locals }) => {
    // 1. Authenticate Request
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const { id: userId, groupIds, groupRoles } = locals.user;
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

        // 2.5. Policy Enforcement (Classification Check)
        const policy = await db.query.classificationPolicies.findFirst({
            where: eq(schema.classificationPolicies.code, doc.classification)
        });

        if (policy) {
            const userRole = doc.groupId ? (groupRoles[doc.groupId] || 'VIEWER') : 'MANAGER';
            const effectiveRoleWeight = doc.groupId ? ROLE_WEIGHT[userRole as Role] || 0 : 3;
            const requiredWeight = ROLE_WEIGHT[policy.minRoleRequired as Role] || 0;

            if (effectiveRoleWeight < requiredWeight) {
                throw error(403, `Insufficient clearance for ${doc.classification} classification. Required: ${policy.minRoleRequired}`);
            }

            if (policy.requiresAudit) {
                await db.insert(schema.auditLogs).values({
                    userId: locals.user.id,
                    event: 'CLASSIFIED_DOCUMENT_ACCESSED',
                    metadata: JSON.stringify({ docId: doc.id, fileName: doc.name, classification: doc.classification })
                });
            }
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
