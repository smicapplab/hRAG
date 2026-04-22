import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const logs = await db.select({
        id: auditLogs.id,
        event: auditLogs.event,
        timestamp: auditLogs.timestamp,
        metadata: auditLogs.metadata,
        userName: users.name,
        userEmail: users.email
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.timestamp))
    .limit(200);
    
    return {
        logs: logs.map(l => ({
            ...l,
            metadata: l.metadata ? JSON.parse(l.metadata) : {}
        }))
    };
};
