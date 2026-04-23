import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as mergeHandler } from '../../../routes/api/v1/admin/tags/merge/+server';
import { POST as promoteHandler } from '../../../routes/api/v1/admin/tags/[id]/promote/+server';
import { db } from '../db';
import * as schema from '../db/schema';

vi.mock('../db', () => ({
    db: {
        query: {
            tags: {
                findFirst: vi.fn()
            }
        },
        transaction: vi.fn(),
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue({})
        }),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue({})
            })
        }),
        delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({})
        }),
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])
            })
        })
    }
}));

describe('Taxonomy Governance Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Tag Promotion', () => {
        it('should allow admins to promote tags', async () => {
            const locals = { user: { isAdmin: true, id: 'admin-1' } };
            const params = { id: 'tag-1' };
            
            (db.query.tags.findFirst as any).mockResolvedValue({ id: 'tag-1', name: 'AI_TAG' });

            const response = await promoteHandler({ params, locals } as any);
            const result = await response.json();

            expect(result.success).toBe(true);
            expect(db.update).toHaveBeenCalled();
        });

        it('should forbid non-admins from promoting tags', async () => {
            const locals = { user: { isAdmin: false, id: 'user-1' } };
            const params = { id: 'tag-1' };
            
            (db.query.tags.findFirst as any).mockResolvedValue({ id: 'tag-1', name: 'AI_TAG' });

            const response = await promoteHandler({ params, locals } as any);
            const result = await response.json();

            expect(response.status).toBe(403);
            expect(result.error).toContain('Forbidden');
        });
    });

    describe('Tag Merging', () => {
        it('should allow admins to merge tags', async () => {
            const locals = { user: { isAdmin: true, id: 'admin-1' } };
            const request = {
                json: async () => ({ sourceTagId: 'tag-old', targetTagId: 'tag-new' })
            };

            (db.query.tags.findFirst as any)
                .mockResolvedValueOnce({ id: 'tag-old', name: 'OLD' })
                .mockResolvedValueOnce({ id: 'tag-new', name: 'NEW' });

            (db.transaction as any).mockImplementation(async (cb: any) => {
                const tx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([{ documentId: 'doc-1' }])
                        })
                    }),
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockReturnValue({
                            onConflictDoNothing: vi.fn().mockResolvedValue({})
                        })
                    }),
                    delete: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue({})
                    })
                };
                return await cb(tx);
            });

            const response = await mergeHandler({ request, locals } as any);
            const result = await response.json();

            expect(result.success).toBe(true);
            expect(db.transaction).toHaveBeenCalled();
        });

        it('should forbid non-admins from merging tags', async () => {
            const locals = { user: { isAdmin: false, id: 'user-1' } };
            const request = { json: async () => ({}) };

            const response = await mergeHandler({ request, locals } as any);
            expect(response.status).toBe(403);
        });
    });
});
