import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    // 1. Guard: Only Admins can access the Control Plane
    if (!locals.user?.isAdmin) {
        throw redirect(302, '/chat');
    }

    try {
        // 2. Fetch all users with their primary group associations
        const users = await db.query.users.findMany({
            with: {
                groups: {
                    with: {
                        group: true
                    }
                }
            },
            orderBy: (u, { asc }) => [asc(u.name)]
        });

        // 3. Fetch full group hierarchy
        const groups = await db.query.groups.findMany({
            orderBy: (g, { asc }) => [asc(g.level), asc(g.name)]
        });

        // 4. Transform groups into a recursive tree for the UI
        const buildTree = (parentId: string | null = null): any[] => {
            return groups
                .filter(g => g.parentId === parentId)
                .map(g => ({
                    ...g,
                    children: buildTree(g.id)
                }));
        };

        const hierarchy = buildTree(null);

        return {
            users: users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                isAdmin: u.isAdmin,
                isCompliance: u.isCompliance,
                tokenVersion: u.tokenVersion,
                groups: u.groups.map(g => ({
                    id: g.groupId,
                    name: g.group.name,
                    role: g.role
                }))
            })),
            hierarchy
        };

    } catch (err) {
        console.error('[Admin] Load error:', err);
        throw error(500, 'Failed to load control plane data');
    }
};

export const actions: Actions = {
    createGroup: async ({ request, locals }) => {
        if (!locals.user?.isAdmin) throw error(403, 'Forbidden');
        const user = locals.user;
        
        const data = await request.formData();
        const name = data.get('name') as string;
        const parentId = data.get('parentId') as string | null;
        const level = parseInt(data.get('level') as string) || 1;

        if (!name) return fail(400, { message: 'Group name is required' });
        if (level > 3) return fail(400, { message: 'Maximum hierarchy depth reached' });

        const newId = crypto.randomUUID();
        let path = newId;

        if (parentId) {
            const parent = await db.query.groups.findFirst({
                where: eq(schema.groups.id, parentId)
            });
            if (parent) {
                path = `${parent.path}/${newId}`;
            }
        }

        await db.insert(schema.groups).values({
            id: newId,
            name,
            parentId,
            level,
            path
        });

        // Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: user.id,
            event: 'GROUP_CREATED',
            metadata: JSON.stringify({ newId, name, parentId, level, path })
        });

        return { success: true };
    },

    updateGroup: async ({ request, locals }) => {
        if (!locals.user?.isAdmin) throw error(403, 'Forbidden');
        const user = locals.user;
        
        const data = await request.formData();
        const id = data.get('id') as string;
        const name = data.get('name') as string;

        if (!id || !name) return fail(400, { message: 'Missing required fields' });

        const [oldGroup] = await db.select().from(schema.groups).where(eq(schema.groups.id, id));
        if (!oldGroup) throw error(404, 'Group not found');

        await db.update(schema.groups)
            .set({ name })
            .where(eq(schema.groups.id, id));

        // Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: user.id,
            event: 'GROUP_UPDATED',
            metadata: JSON.stringify({ id, oldName: oldGroup.name, newName: name })
        });

        return { success: true };
    },

    deleteGroup: async ({ request, locals }) => {
        if (!locals.user?.isAdmin) throw error(403, 'Forbidden');
        const user = locals.user;
        
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'Missing group ID' });

        await db.delete(schema.groups).where(eq(schema.groups.id, id));

        // Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: user.id,
            event: 'GROUP_DELETED',
            metadata: JSON.stringify({ id })
        });

        return { success: true };
    },

    updateRole: async ({ request, locals }) => {
        if (!locals.user?.isAdmin) throw error(403, 'Forbidden');
        const adminUser = locals.user;
        
        const data = await request.formData();
        const userId = data.get('userId') as string;
        const groupId = data.get('groupId') as string;
        const role = data.get('role') as any;

        if (!userId || !groupId || !role) return fail(400, { message: 'Missing required fields' });

        await db.update(schema.usersToGroups)
            .set({ role, grantedBy: adminUser.id, grantedAt: new Date() })
            .where(and(
                eq(schema.usersToGroups.userId, userId),
                eq(schema.usersToGroups.groupId, groupId)
            ));

        // Increment tokenVersion to force security sync on next refresh
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        if (user) {
            await db.update(schema.users)
                .set({ tokenVersion: (user.tokenVersion || 0) + 1 })
                .where(eq(schema.users.id, userId));
        }

        // Audit Logging
        await db.insert(schema.auditLogs).values({
            userId: adminUser.id,
            event: 'ROLE_UPDATED',
            metadata: JSON.stringify({ userId, groupId, role, grantedBy: adminUser.id })
        });

        return { success: true };
    }
};
