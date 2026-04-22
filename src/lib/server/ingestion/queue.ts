import { extractText, chunkText } from './extractor';
import { generateEmbeddings } from './embeddings';
import { aiClassify, resolveClassification, suggestTags } from './classifier';
import { getVectorStore } from '../vectors';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import * as fs from 'node:fs/promises';

export interface IngestionJob {
    id: string;
    docId: string;
    s3Key: string;
    mimeType: string;
    ownerId: string;
    groupIds: string[];
    isPublic: boolean;
    localFilePath: string; // The file temporarily downloaded from S3
    userClassification?: string;
}

class IngestionQueueManager {
    private queue: IngestionJob[] = [];
    private isProcessing = false;

    /**
     * Add a document processing job to the internal background queue.
     * In a production multi-node cluster, this would be backed by BullMQ/Redis.
     */
    addJob(job: IngestionJob) {
        this.queue.push(job);
        // Fire and forget
        this.processQueue().catch(console.error);
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job) continue;

            try {
                console.log(`[Ingestion] Starting job ${job.id} for doc ${job.docId}`);
                await db.update(schema.documents)
                    .set({ ingestionStatus: 'processing', updatedAt: new Date() })
                    .where(eq(schema.documents.id, job.docId));
                await this.processJob(job);
                await db.update(schema.documents)
                    .set({ ingestionStatus: 'done', updatedAt: new Date() })
                    .where(eq(schema.documents.id, job.docId));
                console.log(`[Ingestion] Completed job ${job.id}`);
            } catch (error) {
                console.error(`[Ingestion] Error processing job ${job.id}:`, error);
                await db.update(schema.documents)
                    .set({ ingestionStatus: 'failed', updatedAt: new Date() })
                    .where(eq(schema.documents.id, job.docId));
            } finally {
                // Cleanup temp file even on failure (GEMINI.md mandate for statelessness)
                await fs.unlink(job.localFilePath).catch(() => { });
            }
        }

        this.isProcessing = false;
    }

    private async processJob(job: IngestionJob) {
        // 1. Extract Text
        console.log(`[Ingestion] Extracting text (${job.mimeType})...`);
        const { text, method } = await extractText(job.localFilePath, job.mimeType);

        if (!text || text.trim().length === 0) {
            throw new Error("No text could be extracted from document.");
        }

        // 2. Auto-Classification (High-Water Mark Logic)
        console.log(`[Ingestion] Performing Security Scan...`);
        const aiPolicyCode = await aiClassify(text.slice(0, 10000)); // Sample for performance
        const userPolicyCode = job.userClassification || 'INTERNAL';
        
        const { policyCode, isOverride } = await resolveClassification(userPolicyCode, aiPolicyCode);

        // Update document with final security classification
        await db.update(schema.documents)
            .set({ 
                classification: policyCode,
                aiClassification: aiPolicyCode,
                aiOverride: isOverride,
                reviewStatus: isOverride ? 'PENDING' : 'APPROVED',
                updatedAt: new Date()
            })
            .where(eq(schema.documents.id, job.docId));

        if (isOverride) {
            console.log(`[!] Security Alert: AI Override triggered for ${job.docId}. Locked to ${policyCode}.`);
            // Add audit log entry
            await db.insert(schema.auditLogs).values({
                userId: job.ownerId,
                event: 'SECURITY_OVERRIDE_TRIGGERED',
                metadata: JSON.stringify({
                    resourceId: job.docId,
                    userPolicy: userPolicyCode,
                    aiPolicy: aiPolicyCode,
                    reason: 'AI detected higher sensitivity than user input.'
                })
            });
        }

        // 3. Discovery Tagging
        console.log(`[Ingestion] Scanning for discovery tags...`);
        const tags = await suggestTags(text.slice(0, 10000));
        for (const tagName of tags) {
            // Ensure tag exists
            await db.insert(schema.tags)
                .values({ id: crypto.randomUUID(), name: tagName, isAiGenerated: true })
                .onConflictDoNothing();
            
            const tagRecord = await db.query.tags.findFirst({ where: eq(schema.tags.name, tagName) });
            if (tagRecord) {
                await db.insert(schema.documentsToTags)
                    .values({ documentId: job.docId, tagId: tagRecord.id })
                    .onConflictDoNothing();
            }
        }

        // 4. Chunking
        console.log(`[Ingestion] Chunking text...`);
        const chunks = await chunkText(text);

        // 3. Embedding
        console.log(`[Ingestion] Generating embeddings for ${chunks.length} chunks...`);
        const vectors = await generateEmbeddings(chunks);

        // 4. Construct Vector Documents and Write to LanceDB
        console.log(`[Ingestion] Indexing to VectorStore...`);

        // Prepare Unified ACL (GEMINI.md mandate)
        const accessIds: string[] = [`u:${job.ownerId}`];
        if (job.isPublic) accessIds.push('r:global');
        for (const gid of job.groupIds) {
            accessIds.push(`g:${gid}`);
        }

        const documents = chunks.map((chunkText, i) => {
            return {
                id: crypto.randomUUID(), // unique chunk ID
                docId: job.docId,
                text: chunkText,
                vector: vectors[i],
                ownerId: job.ownerId,
                accessIds, // Hard-Filtering Metadata (GEMINI.md mandate)
                metadata: {
                    chunkIndex: i,
                    extractionMethod: method,
                    originalS3Key: job.s3Key
                }
            };
        });

        const vectorStore = await getVectorStore();
        await vectorStore.addDocuments(documents);
    }
}

export const ingestionQueue = new IngestionQueueManager();
