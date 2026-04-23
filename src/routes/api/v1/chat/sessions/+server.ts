import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = async ({ locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const sessions = await db.query.chatSessions.findMany({
        where: eq(schema.chatSessions.ownerId, locals.user.id),
        orderBy: [desc(schema.chatSessions.updatedAt)],
        limit: 50
    });

    return json(sessions);
};

export const POST = async ({ locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const session = await db.insert(schema.chatSessions).values({
        ownerId: locals.user.id,
        title: 'New Intelligence Research'
    }).returning().get();

    return json(session);
};
