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

        // Auto-Rename Session if it's the first message
        if (recentMessages.length === 1 && session.title === 'New Intelligence Research') {
            const shortTitle = query.slice(0, 30).trim() + (query.length > 30 ? '...' : '');
            await db.update(schema.chatSessions)
                .set({ title: shortTitle })
                .where(eq(schema.chatSessions.id, sessionId));
        }

        // 3. Vector Search (Strictly Document-Anchored)
        const queryVector = await generateQueryEmbedding(query);
        const vectorStore = await getVectorStore();
        
        // Safety Check: Are there any documents at all?
        const totalDocCount = await db.select({ value: sql`count(*)` }).from(schema.documents);
        const hasDocuments = Number(totalDocCount[0]?.value) > 0;

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

        console.log(`[Chat] Query: "${query}" | Fragments found: ${fragments.length}`);

        // 4. Construct Prompt
        let contextString = "";
        if (!hasDocuments) {
            contextString = "SYSTEM NOTICE: THE INTELLIGENCE VAULT IS COMPLETELY EMPTY. NO DOCUMENTS HAVE BEEN UPLOADED OR INDEXED YET. ADVISE THE USER TO UPLOAD DOCUMENTS TO THE SYSTEM.";
        } else if (fragments.length === 0) {
            contextString = "NO AUTHORIZED FRAGMENTS FOUND. The user has access to some documents, but none are semantically relevant to this specific query.";
        } else {
            contextString = fragments.map(f => `[SOURCE: ${f.metadata.name}] (Score: ${f._distance?.toFixed(4) || 'N/A'}) CONTENT: ${f.text}`).join('\n\n');
        }

        const systemPrompt = `You are hRAG Intelligence, a sophisticated analytical assistant. Your goal is to synthesize data from the provided documents into clear, professional insights.

OPERATIONAL PROTOCOLS:
1. ANCHORING: Base your entire response ONLY on the authorized fragments provided below.
2. SYNTHESIS: Use semantic reasoning. For example, if a document contains professional details about a person, use those details to answer questions about their "resume" or "background" even if those exact words are missing.
3. CITATION: Every assertion must be followed by a citation like [Document Name].
4. UNCERTAINTY: If the fragments truly do not contain information relevant to the query, clearly state what is missing and why you cannot answer. Avoid the phrase "GAP ANALYSIS" unless it's the most natural way to explain a missing data point.
5. CONTEXT: Maintain a helpful, intelligent tone. Do not sound like a terminal or a script.

AUTHORIZED FRAGMENTS:
${contextString}`;

        console.log(`[Chat] Prompt Context Length: ${contextString.length} chars`);

        // 5. Call LLM
        const { model, name: modelName } = await getChatModel();
        const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: query }
        ]);

        const assistantContent = response.content;

        // 6. Auto-Rename Session if it's the first message
        let newTitle: string | undefined;
        if (recentMessages.length === 1 && (session.title === 'New Intelligence Research' || session.title === 'New Research')) {
            try {
                const titlePrompt = `Generate a concise, 3-5 word title for a research session that starts with this query: "${query}". Return ONLY the title, no quotes or punctuation.`;
                const titleResponse = await model.invoke([
                    { role: 'system', content: 'You are a professional research coordinator. You generate short, descriptive titles for inquiries.' },
                    { role: 'user', content: titlePrompt }
                ]);
                newTitle = (titleResponse.content as string).trim();
                if (newTitle) {
                    await db.update(schema.chatSessions)
                        .set({ title: newTitle })
                        .where(eq(schema.chatSessions.id, sessionId));
                }
            } catch (err) {
                console.warn('[Chat] Failed to auto-generate title:', err);
            }
        }

        // 7. Persist Assistant Response
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

        // 8. Log Search Audit
        const queryHash = crypto.createHash('sha256').update(query).digest('hex');
        await db.insert(schema.auditLogs).values({
            userId: userId,
            event: 'CHAT_QUERY_EXECUTED',
            metadata: JSON.stringify({ sessionId, queryHash, returnedHits: fragments.length })
        });

        return json({ 
            content: assistantContent,
            newTitle,
            modelName,
            evidence: fragments.map(f => ({ 
                docId: f.docId, 
                name: f.metadata.name, 
                snippet: f.text.slice(0, 200) 
            })) 
        });

    } catch (err: any) {
        console.error('[API] Chat error:', err);
        return json({ error: err.message || 'Intelligence gateway timeout or error' }, { status: 500 });
    }
};
