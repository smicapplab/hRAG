import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, and, inArray, exists, count, ilike } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const { id: userId, groupIds } = locals.user;
    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('q') || '';
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        // Iron-Clad Privacy Scoping: 
        const accessFilter = (doc: any, { eq, or, and, inArray, exists }: any) => or(
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

        const searchFilter = search 
            ? (doc: any, { ilike: _ilike }: any) => ilike(doc.name, `%${search}%`)
            : undefined;

        const combinedFilter = (doc: any, ops: any) => {
            const acc = accessFilter(doc, ops);
            const srch = searchFilter ? searchFilter(doc, ops) : undefined;
            return srch ? and(acc, srch) : acc;
        };

        // 1. Get total count for pagination
        const [totalCountResult] = await db.select({ value: count() })
            .from(schema.documents)
            .where(combinedFilter(schema.documents, { eq, or, and, inArray, exists, ilike }));

        const totalDocs = totalCountResult.value;

        // 2. Query paginated documents with relations
        const userDocs = await db.query.documents.findMany({
            where: combinedFilter,
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

        // 3. Fetch full group details for the upload dropdown
        const userGroups = groupIds.length > 0 
            ? await db.query.groups.findMany({
                where: inArray(schema.groups.id, groupIds),
                columns: { id: true, name: true }
              })
            : [];

        return {
            documents: userDocs.map(doc => ({
                ...doc,
                isOwner: doc.ownerId === userId,
                userPermission: doc.permissions?.[0]?.permission || (doc.ownerId === userId ? 'OWNER' : 'VIEW'),
                tags: doc.tags.map(t => t.tag.name)
            })),
            userGroups,
            search,
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
