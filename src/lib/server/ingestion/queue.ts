import { extractText, chunkText } from './extractor';
import { generateEmbeddings } from './embeddings';
import { LanceDBStore } from '../vectors/lancedb';
import crypto from 'node:crypto';

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
    private vectorStore = new LanceDBStore();

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
                await this.processJob(job);
                console.log(`[Ingestion] Completed job ${job.id}`);
            } catch (error) {
                console.error(`[Ingestion] Error processing job ${job.id}:`, error);
                // Here we would implement retry logic or DLQ
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
        
        // Prepare Unified ACL
        const accessIds: string[] = [];
        if (job.isPublic) accessIds.push('public:true');
        for (const gid of job.groupIds) {
            accessIds.push(`group:${gid}`);
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

        await this.vectorStore.addDocuments(documents);
    }
}

export const ingestionQueue = new IngestionQueueManager();
