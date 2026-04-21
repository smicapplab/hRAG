import { db } from './index';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

async function hashPassword(password: string) {
    // Simple SHA-256 for seed purposes; replace with argon2/scrypt in auth implementation
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function seedEssential() {
    console.log('[-] Seeding Essential Data...');

    // 1. Create Global Access Group if not exists
    let globalGroup = await db.query.groups.findFirst({
        where: eq(schema.groups.name, 'Global Access')
    });

    if (!globalGroup) {
        const id = crypto.randomUUID();
        [globalGroup] = await db.insert(schema.groups).values({
            id,
            name: 'Global Access',
            level: 1,
            path: id
        }).returning();
        console.log('[+] Global Access group created.');
    }

    // 2. Create Super-User if not exists
    const existingAdmin = await db.query.users.findFirst({
        where: eq(schema.users.email, 'admin@hrag.local')
    });

    if (!existingAdmin) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'hrag-secure-2026';
        const passwordHash = await hashPassword(adminPassword);

        const [admin] = await db.insert(schema.users).values({
            email: 'admin@hrag.local',
            name: 'System Overseer',
            passwordHash,
            isAdmin: true,
            isCompliance: true,
            tokenVersion: 1
        }).returning();

        // Link Admin to Global Group as MANAGER
        await db.insert(schema.usersToGroups).values({
            userId: admin.id,
            groupId: globalGroup.id,
            role: 'MANAGER',
            grantedAt: new Date()
        });
        console.log('[+] System Overseer created.');
    }

    // 3. Seed Classification Policies
    const policies = [
        { code: 'PUBLIC', displayName: 'Public Intelligence', minRoleRequired: 'VIEWER', requiresAudit: false },
        { code: 'INTERNAL', displayName: 'Internal Use Only', minRoleRequired: 'VIEWER', requiresAudit: false },
        { code: 'CONFIDENTIAL', displayName: 'Confidential / Sensitive', minRoleRequired: 'EDITOR', requiresAudit: true },
        { code: 'RESTRICTED', displayName: 'Restricted Access', minRoleRequired: 'MANAGER', requiresAudit: true }
    ];

    for (const p of policies) {
        const existing = await db.query.classificationPolicies.findFirst({
            where: eq(schema.classificationPolicies.code, p.code)
        });
        if (!existing) {
            await db.insert(schema.classificationPolicies).values({
                ...p,
                id: crypto.randomUUID()
            });
            console.log(`[+] Policy created: ${p.code}`);
        }
    }

    console.log('[+] Essential seeding complete.');
}

async function seedDemo() {
    console.log('[-] Seeding Demo 3-Level Hierarchy Data...');

    const existingDemoUser = await db.query.users.findFirst({
        where: eq(schema.users.email, 'sarah.chen@hrag.local')
    });

    if (existingDemoUser) {
        console.log('[!] Demo data already present. Skipping.');
        return;
    }

    // 1. Hierarchy: L1 (Group) -> L2 (Sub-Group) -> L3 (Team)
    const l1Id = crypto.randomUUID();
    const [l1] = await db.insert(schema.groups).values({
        id: l1Id,
        name: 'Engineering Division',
        level: 1,
        path: l1Id
    }).returning();

    const l2Id = crypto.randomUUID();
    const [l2] = await db.insert(schema.groups).values({
        id: l2Id,
        name: 'Product Development',
        parentId: l1.id,
        level: 2,
        path: `${l1.id}/${l2Id}`
    }).returning();

    const l3Id = crypto.randomUUID();
    const [l3] = await db.insert(schema.groups).values({
        id: l3Id,
        name: 'Core AI Team',
        parentId: l2.id,
        level: 3,
        path: `${l1.id}/${l2.id}/${l3Id}`
    }).returning();

    // 2. Users
    const passwordHash = await hashPassword('password123');

    // Division Manager (L1)
    const [manager] = await db.insert(schema.users).values({
        email: 'sarah.chen@hrag.local',
        name: 'Sarah Chen',
        passwordHash,
    }).returning();

    // Team Lead (L3)
    const [lead] = await db.insert(schema.users).values({
        email: 'marcus.wright@hrag.local',
        name: 'Marcus Wright',
        passwordHash,
    }).returning();

    // Researcher (L3)
    const [researcher] = await db.insert(schema.users).values({
        email: 'elena.rossi@hrag.local',
        name: 'Elena Rossi',
        passwordHash,
    }).returning();

    // 3. Roles & Inheritance
    await db.insert(schema.usersToGroups).values([
        { userId: manager.id, groupId: l1.id, role: 'MANAGER', grantedAt: new Date() },
        { userId: lead.id, groupId: l3.id, role: 'MANAGER', grantedAt: new Date() },
        { userId: researcher.id, groupId: l3.id, role: 'VIEWER', grantedAt: new Date() }
    ]);

    console.log('[+] Demo 3-level seeding complete.');
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--essential')) {
        await seedEssential();
    } else if (args.includes('--demo')) {
        await seedDemo();
    } else {
        console.log('Usage: tsx seed.ts [--essential | --demo]');
    }
}

main().catch(console.error);
