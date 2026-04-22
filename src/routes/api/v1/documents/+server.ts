import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { s3, ensureBucket } from '$lib/server/security/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ingestionQueue } from '$lib/server/ingestion/queue';
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
            const { ROLE_WEIGHT } = await import('$lib/server/auth/roles');
            const userRole = groupId ? (locals.user.groupRoles[groupId] || 'VIEWER') : 'MANAGER'; // Default to MANAGER for personal uploads if no group? Or check global? 
            // In hRAG, owner is MANAGER of their own document. 
            // However, we check against the target group if provided.

            const effectiveRoleWeight = groupId ? ROLE_WEIGHT[userRole as any] || 0 : 3; // Owner is MANAGER (3)
            const requiredWeight = ROLE_WEIGHT[policy.minRoleRequired as any] || 0;

            if (effectiveRoleWeight < requiredWeight) {
                return json({
                    error: `Insufficient clearance for ${classification} classification. Required: ${policy.minRoleRequired}`
                }, { status: 403 });
            }
        }

        // 2. Stateless Storage: S3 Upload
        const bucket = 'hrag-raw';
        await ensureBucket(bucket);

        const s3Key = `documents/${crypto.randomUUID()}_${file.name}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: file.type
        }));

        // 3. Metadata Persistence
        const [doc] = await db.insert(schema.documents).values({
            name: file.name,
            s3Key,
            ownerId: locals.user.id,
            groupId: groupId || null,
            classification,
        }).returning();

        // 4. Temporary Local File for Ingestion Worker
        const tmpPath = path.join(os.tmpdir(), `${doc.id}_${file.name}`);
        await fs.writeFile(tmpPath, buffer);

        // 5. Enqueue Async Extraction/Embedding
        // This process is backgrounded to not block the response
        ingestionQueue.addJob({
            id: crypto.randomUUID(),
            docId: doc.id,
            s3Key,
            mimeType: file.type,
            ownerId: locals.user.id,
            groupIds: groupId ? [groupId] : [],
            isPublic: classification === 'PUBLIC',
            localFilePath: tmpPath
        });

        // 6. Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'DOCUMENT_UPLOAD',
            metadata: JSON.stringify({ docId: doc.id, fileName: file.name, classification })
        });

        return json({ success: true, document: doc });
    } catch (err: any) {
        console.error('[API] Error uploading document:', err);
        return json({ error: 'Failed to process document upload' }, { status: 500 });
    }
};
