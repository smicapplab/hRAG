import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const sessions = await db.query.chatSessions.findMany({
        where: eq(schema.chatSessions.ownerId, locals.user.id),
        orderBy: [desc(schema.chatSessions.updatedAt)],
        limit: 50
    });

    return {
        sessions
    };
};
