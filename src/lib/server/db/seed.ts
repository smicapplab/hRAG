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
        const adminPassword = process.env.ADMIN_PASSWORD || '023ca5e527773ab6';
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
        { code: 'PUBLIC', displayName: 'Public Intelligence', minRoleRequired: 'VIEWER' as const, requiresAudit: false, severityWeight: 0, description: 'Open source or public domain data.' },
        { code: 'INTERNAL', displayName: 'Internal Use Only', minRoleRequired: 'VIEWER' as const, requiresAudit: false, severityWeight: 1, description: 'Standard corporate data for all employees.' },
        { code: 'CONFIDENTIAL', displayName: 'Confidential / Sensitive', minRoleRequired: 'EDITOR' as const, requiresAudit: true, severityWeight: 2, description: 'Sensitive data restricted to authorized personnel.' },
        { code: 'RESTRICTED', displayName: 'Restricted Access', minRoleRequired: 'MANAGER' as const, requiresAudit: true, severityWeight: 3, description: 'Highly sensitive data requiring management approval.' }
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
        } else {
            // Update to ensure severityWeight and description are present
            await db.update(schema.classificationPolicies)
                .set({ severityWeight: p.severityWeight, description: p.description })
                .where(eq(schema.classificationPolicies.id, existing.id));
        }
    }

    // 4. Seed Canonical Taxonomy Tags
    const canonicalTags = [
        { name: 'FINANCE', color: 'text-signal-blue' },
        { name: 'LEGAL', color: 'text-signal-orange' },
        { name: 'TECH', color: 'text-signal-green' },
        { name: 'HR', color: 'text-muted-foreground' },
        { name: 'OPERATIONS', color: 'text-signal-blue' },
        { name: 'SECURITY', color: 'text-signal-red' },
        { name: 'COMPLIANCE', color: 'text-signal-orange' }
    ];

    for (const t of canonicalTags) {
        const existing = await db.query.tags.findFirst({
            where: eq(schema.tags.name, t.name)
        });
        if (!existing) {
            await db.insert(schema.tags).values({
                id: crypto.randomUUID(),
                name: t.name,
                color: t.color,
                isAiGenerated: false
            });
            console.log(`[+] Canonical Tag created: ${t.name}`);
        }
    }

    // 5. Seed Default System Settings
    const defaultSettings = [
        { key: 'system.version', value: '0.0.1' },
        { key: 'system.maintenance_mode', value: false },
        { key: 'system.vector_engine', value: process.env.VECTOR_STORE_TYPE || 'lancedb' },
        
        { key: 'ingestion.max_file_size', value: 50 * 1024 * 1024 }, // 50MB
        { key: 'ingestion.allowed_extensions', value: ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.md'] },
        
        { key: 'embeddings.provider', value: 'local' },
        { key: 'embeddings.local.model', value: 'Xenova/all-MiniLM-L6-v2' },
        { key: 'embeddings.ollama.model', value: 'nomic-embed-text' },
        { key: 'embeddings.ollama.url', value: 'http://localhost:11434' },
        { key: 'embeddings.openai.model', value: 'text-embedding-3-small' },
        { key: 'embeddings.openai.key', value: '' },
        { key: 'embeddings.google.model', value: 'text-embedding-004' },
        { key: 'embeddings.google.key', value: '' },

        { key: 'classification.auto_enabled', value: true },
        { key: 'classification.tier', value: 'local' },

        { key: 'vectors.pg.url', value: process.env.DATABASE_URL || '' }
    ];

    for (const s of defaultSettings) {
        const existing = await db.query.systemSettings.findFirst({
            where: eq(schema.systemSettings.key, s.key)
        });
        if (!existing) {
            await db.insert(schema.systemSettings).values({
                key: s.key,
                value: JSON.stringify(s.value),
                updatedAt: new Date()
            });
            console.log(`[+] Setting created: ${s.key}`);
        }
    }

    console.log('[+] Essential seeding complete.');
}

async function seedDemo() {
    console.log('[-] Seeding Demo Data (Matching README)...');

    const admin = await db.query.users.findFirst({
        where: eq(schema.users.email, 'admin@hrag.local')
    });

    if (!admin) {
        console.error('[!] Run --essential first.');
        return;
    }

    // 1. Hierarchy: Operations -> Logistics -> Regional
    const opsId = crypto.randomUUID();
    const [ops] = await db.insert(schema.groups).values({
        id: opsId,
        name: 'Field Operations',
        level: 1,
        path: opsId
    }).returning();

    const logId = crypto.randomUUID();
    const [logistics] = await db.insert(schema.groups).values({
        id: logId,
        name: 'Global Logistics',
        parentId: ops.id,
        level: 2,
        path: `${ops.id}/${logId}`
    }).returning();

    // 2. Users (Matching README)
    const passwordHash = await hashPassword('password123');

    const demoUsers = [
        { email: 'manager.ops@hrag.local', name: 'Ops Manager', role: 'MANAGER' as const, groupId: ops.id },
        { email: 'staff.logistics@hrag.local', name: 'Logistics Lead', role: 'VIEWER' as const, groupId: logistics.id },
        { email: 'auditor@hrag.local', name: 'Compliance Auditor', role: 'VIEWER' as const, groupId: ops.id, isCompliance: true }
    ];

    for (const u of demoUsers) {
        let user = await db.query.users.findFirst({ where: eq(schema.users.email, u.email) });
        if (!user) {
            [user] = await db.insert(schema.users).values({
                email: u.email,
                name: u.name,
                passwordHash,
                isCompliance: u.isCompliance || false
            }).returning();
            console.log(`[+] Demo user created: ${u.email}`);
        }

        await db.insert(schema.usersToGroups).values({
            userId: user.id,
            groupId: u.groupId,
            role: u.role,
            grantedAt: new Date()
        }).onConflictDoNothing();
    }

    // 3. Seed some quarantined documents
    const quarantinedDocs = [
        { name: 'Financial_Projections_2026.pdf', s3Key: 'demo/fin_2026.pdf', ownerId: admin.id, classification: 'RESTRICTED', reviewStatus: 'PENDING' as const, tags: ['FINANCE', 'COMPLIANCE'] },
        { name: 'Network_Topology_Internal.png', s3Key: 'demo/net_top.png', ownerId: admin.id, classification: 'CONFIDENTIAL', reviewStatus: 'PENDING' as const, tags: ['SECURITY', 'TECH'] }
    ];

    for (const d of quarantinedDocs) {
        const [doc] = await db.insert(schema.documents).values({
            id: crypto.randomUUID(),
            name: d.name,
            s3Key: d.s3Key,
            ownerId: d.ownerId,
            classification: d.classification,
            reviewStatus: d.reviewStatus,
            ingestionStatus: 'done',
            createdAt: new Date(),
            updatedAt: new Date()
        }).onConflictDoNothing().returning();

        if (doc) {
            for (const tagName of d.tags) {
                const tag = await db.query.tags.findFirst({ where: eq(schema.tags.name, tagName) });
                if (tag) {
                    await db.insert(schema.documentsToTags).values({
                        documentId: doc.id,
                        tagId: tag.id
                    }).onConflictDoNothing();
                }
            }
        }
    }

    console.log('[+] Demo seeding complete.');
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
