import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const DELETE = async ({ params, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id } = params;
    const { id: userId } = locals.user;

    // Verify ownership
    const session = await db.query.chatSessions.findFirst({
        where: and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.ownerId, userId))
    });

    if (!session) return json({ error: 'Session not found' }, { status: 404 });

    await db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, id));

    return json({ success: true });
};

export const PATCH = async ({ params, request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { id: userId } = locals.user;
    const { title } = await request.json();

    if (!title) return json({ error: 'Title is required' }, { status: 400 });

    // Verify ownership
    const session = await db.query.chatSessions.findFirst({
        where: and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.ownerId, userId))
    });

    if (!session) return json({ error: 'Session not found' }, { status: 404 });

    await db.update(schema.chatSessions)
        .set({ title, updatedAt: new Date() })
        .where(eq(schema.chatSessions.id, id));

    return json({ success: true });
};
