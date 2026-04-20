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

	// 1. Create Global Group if not exists
	let globalGroup = await db.query.groups.findFirst({
		where: eq(schema.groups.name, 'Global Access')
	});

	if (!globalGroup) {
		[globalGroup] = await db
			.insert(schema.groups)
			.values({
				name: 'Global Access'
			})
			.returning();
		console.log('[+] Global Access group created.');
	}

	// 2. Create Super-User if not exists
	const existingAdmin = await db.query.users.findFirst({
		where: eq(schema.users.email, 'admin@hrag.local')
	});

	if (!existingAdmin) {
		const adminPassword = process.env.ADMIN_PASSWORD || 'hrag-secure-2026';
		const passwordHash = await hashPassword(adminPassword);

		const [admin] = await db
			.insert(schema.users)
			.values({
				email: 'admin@hrag.local',
				name: 'System Overseer',
				passwordHash,
				level: 'manager',
				isAdmin: true,
				isCompliance: true
			})
			.returning();

		// Link Admin to Global Group
		await db.insert(schema.usersToGroups).values({
			userId: admin.id,
			groupId: globalGroup.id
		});
		console.log('[+] System Overseer created.');
	} else {
		console.log('[!] admin@hrag.local already exists. Skipping user creation.');
	}

	console.log('[+] Essential seeding complete.');
}

async function seedDemo() {
	console.log('[-] Seeding Demo Multi-Tenant Data...');

	// Check if demo data already exists to avoid duplication
	const existingDemoUser = await db.query.users.findFirst({
		where: eq(schema.users.email, 'manager.ops@hrag.local')
	});

	if (existingDemoUser) {
		console.log('[!] Demo data already present. Skipping.');
		return;
	}

	// 1. Departments
	const [fieldOps] = await db
		.insert(schema.departments)
		.values({ name: 'Field Operations' })
		.returning();
	const [hqAdmin] = await db
		.insert(schema.departments)
		.values({ name: 'HQ Administration' })
		.returning();

	// 2. Groups
	const [logistics] = await db
		.insert(schema.groups)
		.values({ name: 'Logistics Alpha', departmentId: fieldOps.id })
		.returning();
	const [legal] = await db
		.insert(schema.groups)
		.values({ name: 'Legal & Compliance', departmentId: hqAdmin.id })
		.returning();
	await db
		.insert(schema.groups)
		.values({ name: 'Intelligence Unit', departmentId: hqAdmin.id })
		.returning();

	// 3. Users
	const passwordHash = await hashPassword('password123');

	// Manager for Field Ops
	const [manager] = await db
		.insert(schema.users)
		.values({
			email: 'manager.ops@hrag.local',
			name: 'Sarah Chen',
			passwordHash,
			level: 'manager'
		})
		.returning();

	// Staff for Logistics
	const [staff] = await db
		.insert(schema.users)
		.values({
			email: 'staff.logistics@hrag.local',
			name: 'Marcus Wright',
			passwordHash,
			level: 'staff'
		})
		.returning();

	// Compliance Auditor
	const [auditor] = await db
		.insert(schema.users)
		.values({
			email: 'auditor@hrag.local',
			name: 'Elena Rossi',
			passwordHash,
			level: 'staff',
			isCompliance: true
		})
		.returning();

	// 4. Group Memberships
	await db.insert(schema.usersToGroups).values([
		{ userId: manager.id, groupId: logistics.id },
		{ userId: staff.id, groupId: logistics.id },
		{ userId: auditor.id, groupId: legal.id }
	]);

	// 5. Sample Documents
	await db.insert(schema.documents).values([
		{
			name: 'field_ops_logistics.md',
			s3Key: 'hrag-raw/field_ops_logistics.md',
			ownerId: manager.id,
			groupId: logistics.id,
			classification: 'CONFIDENTIAL'
		},
		{
			name: 'security_audit_hq.txt',
			s3Key: 'hrag-raw/security_audit_hq.txt',
			ownerId: auditor.id,
			groupId: legal.id,
			classification: 'INTERNAL'
		},
		{
			name: 'rag_survey.pdf',
			s3Key: 'hrag-raw/rag_survey.pdf',
			ownerId: manager.id, // Owned by manager but shared globally if needed
			groupId: null, // Global
			classification: 'PUBLIC'
		}
	]);

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
