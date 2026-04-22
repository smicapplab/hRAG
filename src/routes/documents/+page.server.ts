import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, and, inArray, exists, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const { id: userId, groupIds } = locals.user;
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        // Iron-Clad Privacy Scoping: 
        // We use an 'exists' subquery for sharing to avoid the inArray limit (10k+ docs)
        const filter = (doc: any, { eq, or, and, inArray, exists }: any) => or(
            eq(doc.ownerId, userId),
            eq(doc.classification, 'PUBLIC'),
            groupIds.length > 0 ? inArray(doc.groupId, groupIds) : undefined,
            exists(
                db.select()
                    .from(schema.documentPermissions)
                    .where(and(
                        eq(schema.documentPermissions.documentId, doc.id),
                        eq(schema.documentPermissions.userId, userId)
                    ))
            )
        );

        // 1. Get total count for pagination
        const [totalCountResult] = await db.select({ value: count() })
            .from(schema.documents)
            .where(filter(schema.documents, { eq, or, and, inArray, exists }));

        const totalDocs = totalCountResult.value;

        // 2. Query paginated documents with relations
        const userDocs = await db.query.documents.findMany({
            where: filter,
            limit,
            offset,
            with: {
                permissions: {
                    where: eq(schema.documentPermissions.userId, userId)
                },
                tags: {
                    with: {
                        tag: true
                    }
                }
            },
            orderBy: (docs, { desc }) => [desc(docs.createdAt)]
        });

        return {
            documents: userDocs.map(doc => ({
                ...doc,
                isOwner: doc.ownerId === userId,
                userPermission: doc.permissions?.[0]?.permission || (doc.ownerId === userId ? 'OWNER' : 'VIEW'),
                tags: doc.tags.map(t => t.tag.name)
            })),
            pagination: {
                total: totalDocs,
                page,
                totalPages: Math.ceil(totalDocs / limit)
            }
        };
    } catch (err) {
        console.error("Error loading documents:", err);
        return {
            documents: [],
            pagination: { total: 0, page: 1, totalPages: 0 }
        };
    }
};
