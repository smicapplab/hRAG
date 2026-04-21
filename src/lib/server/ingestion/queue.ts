import { extractText, chunkText } from './extractor';
import { generateEmbeddings } from './embeddings';
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

        // 2. Chunking
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
