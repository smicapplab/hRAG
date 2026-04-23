import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { or, like, ne, and } from 'drizzle-orm';

/**
 * User Search API for Autocomplete
 */
export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const q = url.searchParams.get('q') || '';
    if (q.length < 2) return json({ users: [] });

    try {
        const users = await db.query.users.findMany({
            where: and(
                ne(schema.users.id, locals.user.id),
                or(
                    like(schema.users.email, `%${q}%`),
                    like(schema.users.name, `%${q}%`)
                )
            ),
            columns: {
                id: true,
                email: true,
                name: true
            },
            limit: 10
        });

        return json({ users });
    } catch (err) {
        console.error('[API] User search error:', err);
        return json({ error: 'Internal Error' }, { status: 500 });
    }
};
