import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and, or, inArray, exists } from 'drizzle-orm';
import { getVectorStore } from '$lib/server/vectors';

/**
 * Fragments API
 * Returns paginated raw text chunks from the vector store for a document.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id: docId } = params;
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 100);
    const offset = (page - 1) * limit;

    try {
        // 1. Relational Access Verification (Defense-in-Depth)
        const { id: userId, groupIds } = locals.user;
        
        const [doc] = await db.select()
            .from(schema.documents)
            .where(
                and(
                    eq(schema.documents.id, docId),
                    or(
                        eq(schema.documents.ownerId, userId),
                        eq(schema.documents.classification, 'PUBLIC'),
                        groupIds.length > 0 ? inArray(schema.documents.groupId, groupIds) : undefined,
                        exists(
                            db.select()
                                .from(schema.documentPermissions)
                                .where(and(
                                    eq(schema.documentPermissions.documentId, schema.documents.id),
                                    eq(schema.documentPermissions.userId, userId)
                                ))
                        )
                    )
                )
            );

        if (!doc && !locals.user.isAdmin) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch from Vector Store
        const vectorStore = await getVectorStore();
        const { fragments, total } = await vectorStore.fetchFragments(docId, limit, offset);

        return json({
            fragments: fragments.map(f => ({
                id: rowId(f.id),
                text: f.text,
                metadata: f.metadata
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (err: any) {
        console.error('[API] Fragments error:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

function rowId(id: any): string {
    return typeof id === 'string' ? id : JSON.stringify(id);
}
