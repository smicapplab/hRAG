import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { getVectorStore } from '$lib/server/vectors';
import { generateQueryEmbedding } from '$lib/server/ingestion/embeddings';
import crypto from 'node:crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
    // 1. Authenticate Request
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId, groupIds } = locals.user;

    try {
        const body = await request.json();
        let { query, limit = 5, offset = 0, tags = [], classification } = body;

        if (!query || typeof query !== 'string') {
            return json({ error: 'Invalid query string' }, { status: 400 });
        }

        // Spec: Validate and cap limit/offset
        limit = Math.min(Math.max(1, limit), 50);
        offset = Math.max(0, offset);

        // 2. Generate Embedding
        const queryVector = await generateQueryEmbedding(query);

        // Fetch shared document IDs for the user
        const sharedDocs = await db.select({ id: schema.documentPermissions.documentId })
            .from(schema.documentPermissions)
            .where(eq(schema.documentPermissions.userId, userId));
        
        const authorizedDocIds = sharedDocs.map(d => d.id);

        // --- Tag-Based Filtering Overlay ---
        let tagFilteredDocIds: string[] | null = null;
        if (tags.length > 0) {
            const tagResults = await db.select({ docId: schema.documentsToTags.documentId })
                .from(schema.documentsToTags)
                .innerJoin(schema.tags, eq(schema.documentsToTags.tagId, schema.tags.id))
                .where(inArray(schema.tags.name, tags));
            tagFilteredDocIds = tagResults.map(t => t.docId);
        }

        // 3. Iron-Clad Vector Search (Pre-Filter)
        // VectorStore enforces Engine-Level unified ACL scoping
        const vectorStore = await getVectorStore();
        
        // Increase limit slightly for vector search to account for deduplication
        const vectorResults = await vectorStore.similaritySearch(queryVector, limit * 2, {
            userId,
            groupIds: groupIds || [],
            authorizedDocIds: authorizedDocIds,
            mandatoryDocIds: tagFilteredDocIds || undefined
        });

        if (vectorResults.length === 0) {
            return json({ query, results: [] });
        }

        // Extract unique relation docIds from vector results
        const retrievedDocIds = [...new Set(vectorResults.map(v => v.docId))];

        // 4. Defense-in-Depth (Relational Post-Validation)
        // Ensure that the documents STILL exist and STILL match user permissions 
        // in the source-of-truth metadata database before releasing the fragments.
        const authFilters = [
            eq(schema.documents.ownerId, userId),
            eq(schema.documents.classification, 'PUBLIC')
        ];
        if (groupIds.length > 0) authFilters.push(inArray(schema.documents.groupId, groupIds));
        if (authorizedDocIds.length > 0) authFilters.push(inArray(schema.documents.id, authorizedDocIds));

        const validRelationalDocs = await db.query.documents.findMany({
            where: (doc, { and, or, inArray, eq }) => and(
                inArray(doc.id, retrievedDocIds),
                or(...authFilters),
                classification ? eq(doc.classification, classification) : undefined
            )
        });

        // Map valid relation docs for quick lookup
        const validRelDocsMap = new Map(validRelationalDocs.map(d => [d.id, d]));

        // 5. Final Filtering, Deduplication & Delivery
        // Group by docId and keep only the best-scoring chunk per document
        const bestByDoc = new Map<string, typeof vectorResults[0]>();
        for (const v of vectorResults) {
            if (!validRelDocsMap.has(v.docId)) continue;
            const existing = bestByDoc.get(v.docId);
            const score = v._distance ?? Infinity;
            const existingScore = existing?._distance ?? Infinity;
            // Lower _distance = better match in LanceDB
            if (!existing || score < existingScore) {
                bestByDoc.set(v.docId, v);
            }
        }

        // Apply pagination (limit/offset) on the deduplicated results
        const pagedResults = [...bestByDoc.values()].slice(offset, offset + limit);

        // BATCH FETCH ALL TAGS for the results to avoid N+1 queries
        const resultDocIds = pagedResults.map(r => r.docId);
        const allTags = resultDocIds.length > 0 
            ? await db.select({ docId: schema.documentsToTags.documentId, name: schema.tags.name })
                .from(schema.documentsToTags)
                .innerJoin(schema.tags, eq(schema.documentsToTags.tagId, schema.tags.id))
                .where(inArray(schema.documentsToTags.documentId, resultDocIds))
            : [];

        const tagsByDocId = new Map<string, string[]>();
        allTags.forEach(t => {
            const list = tagsByDocId.get(t.docId) || [];
            list.push(t.name);
            tagsByDocId.set(t.docId, list);
        });

        const secureResults = pagedResults.map(v => {
            const docMeta = validRelDocsMap.get(v.docId)!;
            
            return {
                id: v.id,
                docId: v.docId,
                name: docMeta.name,
                classification: docMeta.classification,
                updatedAt: docMeta.updatedAt,
                ownerId: docMeta.ownerId,
                text: v.text,
                score: v._distance ?? 0,
                tags: tagsByDocId.get(v.docId) || [],
                metadata: v.metadata
            };
        });

        // Sort by score ascending (lower distance = higher relevance)
        secureResults.sort((a, b) => a.score - b.score);

        // 6. Audit Logging
        // Log the search action asynchronously
        const queryHash = crypto.createHash('sha256').update(query).digest('hex');
        const resultsHash = crypto.createHash('sha256').update(JSON.stringify(secureResults.map(r => r.id))).digest('hex');
        
        db.insert(schema.auditLogs).values({
            userId: userId,
            event: 'VECTOR_SEARCH_EXECUTED',
            metadata: JSON.stringify({ queryHash, resultsHash, returnedHits: secureResults.length })
        }).catch(err => console.error("Failed to log search audit:", err));

        return json({ query, results: secureResults });

    } catch (err: any) {
        console.error('[API] Error during vector search:', err);
        return json({ error: 'Search gateway encountered an exception' }, { status: 500 });
    }
};
