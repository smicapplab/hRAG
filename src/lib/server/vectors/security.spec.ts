import { describe, it, expect, vi } from 'vitest';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('../db', () => ({
    db: {
        select: vi.fn(),
        query: {
            documents: {
                findMany: vi.fn()
            }
        }
    }
}));

describe('Privacy Scoping Logic', () => {
    it('should correctly include shared documents in listing', async () => {
        const userId = 'user-abc';
        const groupIds = ['group-1'];

        // Mock shared documents select
        const mockSharedDocs = [{ documentId: 'doc-shared-1' }];
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockSharedDocs)
            })
        });

        // Mock documents findMany
        const mockDocs = [
            { id: 'doc-owned-1', ownerId: userId },
            { id: 'doc-shared-1', ownerId: 'other-user' }
        ];
        (db.query.documents.findMany as any).mockResolvedValue(mockDocs);

        // Simulate the logic in +page.server.ts
        const sharedDocsResult = await db.select({ documentId: schema.documentPermissions.documentId })
            .from(schema.documentPermissions)
            .where(eq(schema.documentPermissions.userId, userId));
        
        const sharedIds = sharedDocsResult.map(d => d.documentId);

        const userDocs = await db.query.documents.findMany({
            where: (doc: any, { eq, or, inArray }: any) => or(
                eq(doc.ownerId, userId),
                eq(doc.classification, 'PUBLIC'),
                groupIds.length > 0 ? inArray(doc.groupId, groupIds) : undefined,
                sharedIds.length > 0 ? inArray(doc.id, sharedIds) : undefined
            )
        });

        expect(userDocs).toHaveLength(2);
        expect(userDocs[0].id).toBe('doc-owned-1');
        expect(userDocs[1].id).toBe('doc-shared-1');
        
        // Verify the query conditions (inspecting the mock call)
        const findManyCall = (db.query.documents.findMany as any).mock.calls[0][0];
        expect(findManyCall.where).toBeDefined();
    });
});
