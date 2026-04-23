import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as uploadHandler } from './+server';
import { db } from '$lib/server/db';
import { ingestionQueue } from '$lib/server/ingestion/queue';
import { s3 } from '$lib/server/security/s3';

vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            classificationPolicies: {
                findFirst: vi.fn().mockResolvedValue({ code: 'INTERNAL', minRoleRequired: 'VIEWER', severityWeight: 1 })
            }
        },
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: 'doc-1', name: 'test.txt' }])
            })
        })
    }
}));

vi.mock('$lib/server/ingestion/queue', () => ({
    ingestionQueue: {
        addJob: vi.fn()
    }
}));

vi.mock('$lib/server/security/s3', () => ({
    s3: {
        send: vi.fn()
    },
    ensureBucket: vi.fn()
}));

// Mock fs/promises and other node modules
vi.mock('fs/promises', () => ({
    writeFile: vi.fn().mockResolvedValue(undefined)
}));

describe('Document Upload API (Async Refactor)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return immediately and defer S3 upload to worker', async () => {
        const fileContent = 'Hello World';
        const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('classification', 'INTERNAL');

        const request = new Request('http://localhost/api/v1/documents', {
            method: 'POST',
            body: formData
        });

        const locals = {
            user: { id: 'user-1', groupRoles: {}, isAdmin: false }
        };

        const response = await uploadHandler({ request, locals } as any);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.message).toContain('accepted for processing');

        // VERIFY: S3.send should NOT have been called in the handler
        expect(s3.send).not.toHaveBeenCalled();

        // VERIFY: ingestionQueue.addJob SHOULD have been called with the buffer
        expect(ingestionQueue.addJob).toHaveBeenCalledWith(expect.objectContaining({
            docId: 'doc-1',
            uploadBuffer: expect.any(Buffer)
        }));
    });
});
