import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, asc, desc, sql, inArray, and } from 'drizzle-orm';
import { getChatModel } from '$lib/server/chat/engine';
import { getVectorStore } from '$lib/server/vectors';
import { generateQueryEmbedding } from '$lib/server/ingestion/embeddings';
import crypto from 'node:crypto';

export const POST = async ({ request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    const { id: userId, groupIds } = locals.user;

    try {
        const { query, sessionId } = await request.json();

        if (!query || !sessionId) {
            return json({ error: 'Missing query or sessionId' }, { status: 400 });
        }

        // 0. Verify Session Ownership
        const session = await db.query.chatSessions.findFirst({
            where: and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.ownerId, userId))
        });
        if (!session) return json({ error: 'Session not found or unauthorized' }, { status: 404 });

        // 1. Persist User Message
        await db.insert(schema.chatMessages).values({
            sessionId,
            role: 'user',
            content: query
        });

        // 2. Get Recent History (Sliding Window)
        const recentMessages = await db.query.chatMessages.findMany({
            where: eq(schema.chatMessages.sessionId, sessionId),
            orderBy: [desc(schema.chatMessages.createdAt)],
            limit: 6
        });
        const history = recentMessages.reverse();

        // 3. Vector Search (Strictly Document-Anchored)
        const queryVector = await generateQueryEmbedding(query);
        const vectorStore = await getVectorStore();
        
        // Fetch shared document IDs for the user (Unified ACL check)
        const sharedDocs = await db.select({ id: schema.documentPermissions.documentId })
            .from(schema.documentPermissions)
            .where(eq(schema.documentPermissions.userId, userId));
        const authorizedDocIds = sharedDocs.map(d => d.id);

        const fragments = await vectorStore.similaritySearch(queryVector, 5, {
            userId,
            groupIds: groupIds || [],
            authorizedDocIds
        });

        // Enrichment: Fetch document names if missing from metadata
        const docIdsWithMissingNames = fragments
            .filter(f => !f.metadata.name)
            .map(f => f.docId);
        
        if (docIdsWithMissingNames.length > 0) {
            const uniqueDocIds = [...new Set(docIdsWithMissingNames)];
            const docs = await db.select({ id: schema.documents.id, name: schema.documents.name })
                .from(schema.documents)
                .where(inArray(schema.documents.id, uniqueDocIds));
            const nameMap = Object.fromEntries(docs.map(d => [d.id, d.name]));
            
            fragments.forEach(f => {
                if (!f.metadata.name) {
                    f.metadata.name = nameMap[f.docId] || 'Unknown Document';
                }
            });
        }

        // 4. Construct Prompt
        const contextString = fragments.length > 0 
            ? fragments.map(f => `[SOURCE: ${f.metadata.name}] CONTENT: ${f.text}`).join('\n\n')
            : "NO AUTHORIZED FRAGMENTS FOUND.";

        const systemPrompt = `You are hRAG Intelligence, a strictly document-anchored analytical terminal.
        
        RULES:
        1. ANSWER ONLY using the provided authorized fragments.
        2. If the fragments do not contain the answer, perform a GAP ANALYSIS: State exactly what information is missing.
        3. Never use external knowledge or your own training data to answer.
        4. Every assertion MUST be cited like [Document Name].
        
        AUTHORIZED FRAGMENTS:
        ${contextString}`;

        // 5. Call LLM
        const model = await getChatModel();
        const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: query }
        ]);

        const assistantContent = response.content;

        // 6. Persist Assistant Response
        await db.insert(schema.chatMessages).values({
            sessionId,
            role: 'assistant',
            content: assistantContent as string,
            evidence: JSON.stringify(fragments.map(f => ({ 
                docId: f.docId, 
                name: f.metadata.name, 
                snippet: f.text.slice(0, 200) 
            })))
        });

        // 7. Log Search Audit
        const queryHash = crypto.createHash('sha256').update(query).digest('hex');
        await db.insert(schema.auditLogs).values({
            userId: userId,
            event: 'CHAT_QUERY_EXECUTED',
            metadata: JSON.stringify({ sessionId, queryHash, returnedHits: fragments.length })
        });

        return json({ 
            content: assistantContent, 
            evidence: fragments.map(f => ({ 
                docId: f.docId, 
                name: f.metadata.name, 
                snippet: f.text.slice(0, 200) 
            })) 
        });

    } catch (err: any) {
        console.error('[API] Chat error:', err);
        return json({ error: 'Intelligence gateway timeout or error' }, { status: 500 });
    }
};
