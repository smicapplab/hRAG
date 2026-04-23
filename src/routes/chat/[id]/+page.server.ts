import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const session = await db.query.chatSessions.findFirst({
        where: eq(schema.chatSessions.id, params.id)
    });

    if (!session) throw error(404, 'Session not found');
    if (session.ownerId !== locals.user.id) throw error(403, 'Forbidden');

    const messages = await db.query.chatMessages.findMany({
        where: eq(schema.chatMessages.sessionId, params.id),
        orderBy: [asc(schema.chatMessages.createdAt)]
    });

    return {
        session,
        messages: messages.map(m => ({
            ...m,
            evidence: m.evidence ? JSON.parse(m.evidence) : null
        }))
    };
};
