import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanceDBStore } from './lancedb';
import * as lancedb from '@lancedb/lancedb';

// Mock dependencies
vi.mock('@lancedb/lancedb');
vi.mock('$env/dynamic/private', () => ({
    env: {
        LANCEDB_URI: 'memory://'
    }
}));
vi.mock('../security/s3', () => ({
    ensureBucket: vi.fn().mockResolvedValue(true)
}));

describe('LanceDBStore', () => {
    let store: LanceDBStore;
    let mockTable: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        store = new LanceDBStore();
        mockTable = {
            search: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            toArray: vi.fn().mockResolvedValue([])
        };
        const mockDb = {
            tableNames: vi.fn().mockResolvedValue(['hrag_vectors']),
            openTable: vi.fn().mockResolvedValue(mockTable)
        };
        (lancedb.connect as any).mockResolvedValue(mockDb);
    });

    it('should generate correct filter string for basic ACL', async () => {
        await store.similaritySearch([0.1], 5, {
            userId: 'user-1',
            groupIds: ['group-a']
        });

        const filterStr = mockTable.where.mock.calls[0][0];
        expect(filterStr).toContain("ownerId = 'user-1'");
        expect(filterStr).toContain("accessIds LIKE '%,u:user-1,%'");
        expect(filterStr).toContain("accessIds LIKE '%,g:group-a,%'");
        expect(filterStr).toContain("accessIds LIKE '%,r:global,%'");
    });

    it('should combine ACL with authorizedDocIds using OR', async () => {
        await store.similaritySearch([0.1], 5, {
            userId: 'user-1',
            groupIds: [],
            authorizedDocIds: ['doc-1', 'doc-2']
        });

        const filterStr = mockTable.where.mock.calls[0][0];
        expect(filterStr).toContain("(ownerId = 'user-1' OR accessIds LIKE '%,u:user-1,%' OR accessIds LIKE '%,r:global,%') OR docId IN ('doc-1', 'doc-2')");
    });

    it('should intersect with mandatoryDocIds using AND', async () => {
        await store.similaritySearch([0.1], 5, {
            userId: 'user-1',
            groupIds: [],
            mandatoryDocIds: ['doc-tag-1', 'doc-tag-2']
        });

        const filterStr = mockTable.where.mock.calls[0][0];
        expect(filterStr).toBe("(ownerId = 'user-1' OR accessIds LIKE '%,u:user-1,%' OR accessIds LIKE '%,r:global,%') AND docId IN ('doc-tag-1', 'doc-tag-2')");
    });

    it('should handle all filters together', async () => {
        await store.similaritySearch([0.1], 5, {
            userId: 'user-1',
            groupIds: ['group-a'],
            authorizedDocIds: ['doc-shared'],
            mandatoryDocIds: ['doc-tagged']
        });

        const filterStr = mockTable.where.mock.calls[0][0];
        expect(filterStr).toBe("((ownerId = 'user-1' OR accessIds LIKE '%,u:user-1,%' OR accessIds LIKE '%,g:group-a,%' OR accessIds LIKE '%,r:global,%') OR docId IN ('doc-shared')) AND docId IN ('doc-tagged')");
    });
});
