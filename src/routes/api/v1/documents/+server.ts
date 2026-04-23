import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { s3, ensureBucket } from '$lib/server/security/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ingestionQueue } from '$lib/server/ingestion/queue';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';
import crypto from 'node:crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const POST: RequestHandler = async ({ request, locals }) => {
    // 1. Authenticate Request
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Spec 4: Enforce 50MB upload limit
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
        return json({ error: 'File too large' }, { status: 413 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const groupId = formData.get('groupId') as string | null;
        const classification = (formData.get('classification') as string) || 'INTERNAL';

        if (!file) {
            return json({ error: 'No file provided' }, { status: 400 });
        }

        // 1.5. Policy Enforcement (Classification Check)
        const policy = await db.query.classificationPolicies.findFirst({
            where: eq(schema.classificationPolicies.code, classification)
        });

        if (policy) {
            const userRole = groupId ? (locals.user.groupRoles[groupId] || 'VIEWER') : 'MANAGER';
            const effectiveRoleWeight = groupId ? ROLE_WEIGHT[userRole as Role] || 0 : 3; // Owner is MANAGER (3)
            const requiredWeight = ROLE_WEIGHT[policy.minRoleRequired as Role] || 0;

            if (effectiveRoleWeight < requiredWeight) {
                return json({
                    error: `Insufficient clearance for ${classification} classification. Required: ${policy.minRoleRequired}`
                }, { status: 403 });
            }

            if (policy.requiresAudit) {
                await db.insert(schema.auditLogs).values({
                    userId: locals.user.id,
                    event: 'CLASSIFIED_DOCUMENT_ACCESSED',
                    metadata: JSON.stringify({ fileName: file.name, classification })
                });
            }
        }

        // 2. Metadata Persistence (Initial State)
        const s3Key = `documents/${crypto.randomUUID()}_${file.name}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const [doc] = await db.insert(schema.documents).values({
            name: file.name,
            s3Key,
            ownerId: locals.user.id,
            groupId: groupId || null,
            classification,
            ingestionStatus: 'pending' // Start as pending
        }).returning();

        // 3. Prepare for Background Processing
        // Write to local temp file for immediate extraction availability
        const tmpPath = path.join(os.tmpdir(), `${doc.id}_${file.name}`);
        await fs.writeFile(tmpPath, buffer);

        // 4. Enqueue Async Upload & Ingestion
        // This process is backgrounded to not block the response
        ingestionQueue.addJob({
            id: crypto.randomUUID(),
            docId: doc.id,
            name: file.name, // NEW: Pass filename for metadata
            s3Key,
            mimeType: file.type,
            ownerId: locals.user.id,
            groupIds: groupId ? [groupId] : [],
            isPublic: classification === 'PUBLIC',
            localFilePath: tmpPath,
            uploadBuffer: buffer // Pass buffer for background S3 upload
        });

        // 5. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'DOCUMENT_UPLOAD_INITIATED',
            metadata: JSON.stringify({ docId: doc.id, fileName: file.name, classification })
        });

        return json({ 
            success: true, 
            message: 'Document accepted for processing.',
            document: doc 
        });
    } catch (err: any) {
        console.error('[API] Error uploading document:', err);
        return json({ error: 'Failed to initiate document upload' }, { status: 500 });
    }
};
