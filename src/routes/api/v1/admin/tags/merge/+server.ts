import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user || !locals.user.isAdmin) {
        return json({ error: 'Forbidden: Only Admins can merge taxonomy tags.' }, { status: 403 });
    }

    try {
        const { sourceTagId, targetTagId } = await request.json();

        if (!sourceTagId || !targetTagId || sourceTagId === targetTagId) {
            return json({ error: 'Invalid merge parameters' }, { status: 400 });
        }

        const [sourceTag, targetTag] = await Promise.all([
            db.query.tags.findFirst({ where: eq(schema.tags.id, sourceTagId) }),
            db.query.tags.findFirst({ where: eq(schema.tags.id, targetTagId) })
        ]);

        if (!sourceTag || !targetTag) {
            return json({ error: 'One or both tags not found' }, { status: 404 });
        }

        // Atomic relational update: Move all document associations
        // We use a transaction to ensure integrity
        await db.transaction(async (tx) => {
            // 1. Get all documents using the source tag
            const associations = await tx.select()
                .from(schema.documentsToTags)
                .where(eq(schema.documentsToTags.tagId, sourceTagId));

            for (const assoc of associations) {
                // 2. Try to move association to target tag
                // Use onConflictDoNothing to handle cases where document already has the target tag
                await tx.insert(schema.documentsToTags)
                    .values({
                        documentId: assoc.documentId,
                        tagId: targetTagId
                    })
                    .onConflictDoNothing();
            }

            // 3. Delete old associations
            await tx.delete(schema.documentsToTags)
                .where(eq(schema.documentsToTags.tagId, sourceTagId));

            // 4. Delete source tag
            await tx.delete(schema.tags)
                .where(eq(schema.tags.id, sourceTagId));
        });

        await db.insert(schema.auditLogs).values({
            userId: locals.user.id,
            event: 'TAGS_MERGED',
            metadata: JSON.stringify({ 
                source: sourceTag.name, 
                target: targetTag.name,
                sourceId: sourceTagId,
                targetId: targetTagId
            })
        });

        return json({ success: true });
    } catch (err: any) {
        console.error('[API] Error merging tags:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
