import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestionQueue } from './queue';
import { db } from '../db';
import { s3 } from '../security/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

vi.mock('../db', () => ({
    db: {
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue({})
            })
        }),
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue({})
        }),
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])
            })
        }),
        query: {
            tags: {
                findFirst: vi.fn().mockResolvedValue({ id: 'tag-1', name: 'FINANCE' })
            }
        }
    }
}));

vi.mock('../security/s3', () => ({
    s3: {
        send: vi.fn().mockResolvedValue({})
    },
    ensureBucket: vi.fn().mockResolvedValue({})
}));

vi.mock('./extractor', () => ({
    extractText: vi.fn().mockResolvedValue({ text: 'Sample Finance Content', method: 'text' }),
    chunkText: vi.fn().mockResolvedValue(['Sample Finance Content'])
}));

vi.mock('./embeddings', () => ({
    generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]])
}));

vi.mock('../vectors', () => ({
    getVectorStore: vi.fn().mockResolvedValue({
        addDocuments: vi.fn().mockResolvedValue({})
    })
}));

vi.mock('node:fs/promises', () => ({
    unlink: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined)
}));

// Mock registry to avoid DB calls in getSetting
vi.mock('../admin/registry', () => ({
    getSetting: vi.fn().mockResolvedValue(true)
}));

describe('Ingestion Queue Worker (Deferred S3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for select().from() to return empty array (no policies matched/resolved to defaults)
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue([
                { code: 'INTERNAL', severityWeight: 1, minRoleRequired: 'VIEWER' },
                { code: 'RESTRICTED', severityWeight: 3, minRoleRequired: 'MANAGER' }
            ])
        });
    });

    it('should perform S3 upload if uploadBuffer is present', async () => {
        const job = {
            id: 'job-1',
            docId: 'doc-1',
            s3Key: 'documents/test.txt',
            mimeType: 'text/plain',
            ownerId: 'user-1',
            groupIds: [],
            isPublic: false,
            localFilePath: '/tmp/test.txt',
            uploadBuffer: Buffer.from('test content')
        };

        // We call processJob directly for testing
        // @ts-ignore - accessing private for testing
        await ingestionQueue.processJob(job);

        // VERIFY: S3 upload was called
        expect(s3.send).toHaveBeenCalled();
        const call = (s3.send as any).mock.calls.find((c: any) => c[0] instanceof PutObjectCommand);
        expect(call).toBeDefined();
        expect(call[0].input.Bucket).toBe('hrag-raw');
        expect(call[0].input.Key).toBe('documents/test.txt');
    });

    it('should retry on S3 503 errors', async () => {
        const job = {
            id: 'job-1',
            docId: 'doc-1',
            s3Key: 'documents/test.txt',
            mimeType: 'text/plain',
            ownerId: 'user-1',
            groupIds: [],
            isPublic: false,
            localFilePath: '/tmp/test.txt',
            uploadBuffer: Buffer.from('test content')
        };

        // Mock failure then success
        (s3.send as any).mockRejectedValueOnce({ message: 'Service Unavailable', '$metadata': { httpStatusCode: 503 } })
                      .mockResolvedValueOnce({});

        // @ts-ignore
        await ingestionQueue.processJob(job);

        // VERIFY: S3 upload was called twice (initial + retry)
        expect(s3.send).toHaveBeenCalledTimes(2);
    });
});
