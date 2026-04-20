import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LanceDBVectorStore } from './lancedb';
import fs from 'node:fs';
import path from 'node:path';

describe('LanceDB Security Isolation', () => {
    const dbPath = path.resolve('./test-lancedb');
    const store = new LanceDBVectorStore(dbPath);
    
    beforeAll(() => {
        if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { recursive: true });
    });

    afterAll(() => {
        if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { recursive: true });
    });

    it('should isolate documents by owner and access list', async () => {
        const v1 = new Array(384).fill(0.1);
        
        // Doc A: Owned by User 1, Shared with Group 1
        await store.addDocument('doc-a', [{ text: 'Secret A', vector: v1 }], 'user-1', ['g:group-1']);
        
        // Doc B: Private to User 2
        await store.addDocument('doc-b', [{ text: 'Secret B', vector: v1 }], 'user-2', []);

        // 1. User 1 search: Should see Doc A
        const res1 = await store.search(v1, { userId: 'user-1', groupIds: [] });
        expect(res1.some(r => r.docId === 'doc-a')).toBe(true);
        expect(res1.some(r => r.docId === 'doc-b')).toBe(false);

        // 2. User 2 search: Should see Doc B
        const res2 = await store.search(v1, { userId: 'user-2', groupIds: [] });
        expect(res2.some(r => r.docId === 'doc-b')).toBe(true);
        expect(res2.some(r => r.docId === 'doc-a')).toBe(false);

        // 3. User 3 (in Group 1) search: Should see Doc A
        const res3 = await store.search(v1, { userId: 'user-3', groupIds: ['group-1'] });
        expect(res3.some(r => r.docId === 'doc-a')).toBe(true);
        expect(res3.some(r => r.docId === 'doc-b')).toBe(false);
    });

    it('should allow anyone to see documents with r:global', async () => {
        const v1 = new Array(384).fill(0.1);
        
        // Doc Global: Public document
        await store.addDocument('doc-global', [{ text: 'Public Info', vector: v1 }], 'admin', ['r:global']);
        
        // Random user search: Should see Doc Global
        const res = await store.search(v1, { userId: 'random-user', groupIds: [] });
        expect(res.some(r => r.docId === 'doc-global')).toBe(true);
    });

    it('should handle single quotes in IDs (SQL injection prevention)', async () => {
        const v1 = new Array(384).fill(0.1);
        const maliciousId = "user' OR '1'='1";
        
        // This should not throw and should escape properly
        await store.addDocument("doc'1", [{ text: 'Secret 1', vector: v1 }], maliciousId, ["g'group"]);
        
        const res = await store.search(v1, { userId: maliciousId, groupIds: ["g'group"] });
        expect(res.some(r => r.docId === "doc'1")).toBe(true);
    });
});
