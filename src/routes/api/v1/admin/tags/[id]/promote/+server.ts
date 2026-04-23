import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ROLE_WEIGHT, type Role } from '$lib/server/auth/roles';

export const POST: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id: tagId } = params;

    try {
        const tag = await db.query.tags.findFirst({
            where: eq(schema.tags.id, tagId)
        });

        if (!tag) return json({ error: 'Tag not found' }, { status: 404 });

        // Governance Check: Only Admins or Managers (global or per-group) can promote tags
        // For global tags without a specific group, we default to Admin or Global Manager
        const isPrivileged = locals.user.isAdmin;
        
        if (!isPrivileged) {
            return json({ error: 'Forbidden: Only Admins can promote tags to Canonical status.' }, { status: 403 });
        }

        await db.update(schema.tags)
            .set({ isAiGenerated: false })
            .where(eq(schema.tags.id, tagId));

        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'TAG_PROMOTED_TO_CANONICAL',
            metadata: JSON.stringify({ tagId, tagName: tag.name })
        });

        return json({ success: true });
    } catch (err: any) {
        console.error('[API] Error promoting tag:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
