import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// --- Organizational Structure ---

export const groups = sqliteTable('groups', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	parentId: text('parent_id').references((): any => groups.id, { onDelete: 'cascade' }),
	level: integer('level').notNull().default(1),
	path: text('path') // UUID-based materialized path: "id1/id2/id3"
});

// --- Identity & Access ---

export const users = sqliteTable('users', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	isCompliance: integer('is_compliance', { mode: 'boolean' }).notNull().default(false),
	tokenVersion: integer('token_version').notNull().default(1)
});

export const usersToGroups = sqliteTable('users_to_groups', {
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['VIEWER', 'EDITOR', 'MANAGER'] }).notNull().default('VIEWER'),
	grantedBy: text('granted_by').references((): any => users.id, { onDelete: 'set null' }),
	grantedAt: integer('granted_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (t) => ({
	pk: primaryKey({ columns: [t.userId, t.groupId] })
}));

// --- Document Intelligence ---

export const classificationPolicies = sqliteTable('classification_policies', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	code: text('code').notNull().unique(), // e.g., 'CONFIDENTIAL'
	displayName: text('display_name').notNull(),
	minRoleRequired: text('min_role_required', { enum: ['VIEWER', 'EDITOR', 'MANAGER'] }).notNull().default('VIEWER'),
	requiresAudit: integer('requires_audit', { mode: 'boolean' }).notNull().default(false),
	severityWeight: integer('severity_weight').notNull().default(1),
	description: text('description')
});

export const documents = sqliteTable('documents', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	s3Key: text('s3_key').notNull(),
	ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'set null' }),
	groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
	classification: text('classification').notNull().default('INTERNAL'),
	ingestionStatus: text('ingestion_status', { enum: ['pending', 'processing', 'done', 'failed'] }).notNull().default('pending'),
	aiClassification: text('ai_classification'),
	aiOverride: integer('ai_override', { mode: 'boolean' }).notNull().default(false),
	reviewStatus: text('review_status', { enum: ['PENDING', 'APPROVED', 'OVERRIDDEN'] }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const documentPermissions = sqliteTable('document_permissions', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	permission: text('permission', { enum: ['VIEW', 'EDIT'] }).notNull().default('VIEW'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// --- Auditing (SOC2/GDPR) ---

export const systemSettings = sqliteTable('system_settings', {
	key: text('key').primaryKey(), // e.g., 'ingestion.max_file_size'
	value: text('value').notNull(), // JSON stringified
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' })
});

export const nodeHeartbeats = sqliteTable('node_heartbeats', {
	nodeId: text('node_id').primaryKey(),
	hostname: text('hostname').notNull(),
	isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
	metrics: text('metrics').notNull(), // JSON string: { cpu, mem, lag }
	lastSeen: integer('last_seen', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const auditLogs = sqliteTable('audit_logs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
	event: text('event').notNull(),
	timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	metadata: text('metadata') // JSON string
});

// --- Relations ---

export const groupsRelations = relations(groups, ({ one, many }) => ({
	parent: one(groups, {
		fields: [groups.parentId],
		references: [groups.id],
		relationName: 'group_hierarchy'
	}),
	children: many(groups, {
		relationName: 'group_hierarchy'
	}),
	users: many(usersToGroups)
}));

export const usersRelations = relations(users, ({ many }) => ({
	groups: many(usersToGroups, { relationName: 'user_groups' }),
	grantedGroups: many(usersToGroups, { relationName: 'granted_groups' }),
	documents: many(documents)
}));

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
	user: one(users, {
		fields: [usersToGroups.userId],
		references: [users.id],
		relationName: 'user_groups'
	}),
	group: one(groups, {
		fields: [usersToGroups.groupId],
		references: [groups.id]
	}),
	granter: one(users, {
		fields: [usersToGroups.grantedBy],
		references: [users.id],
		relationName: 'granted_groups'
	})
}));

export const documentsRelations = relations(documents, ({ many }) => ({
	permissions: many(documentPermissions)
}));

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
	document: one(documents, {
		fields: [documentPermissions.documentId],
		references: [documents.id]
	}),
	user: one(users, {
		fields: [documentPermissions.userId],
		references: [users.id]
	})
}));

export const classificationPoliciesRelations = relations(classificationPolicies, ({ many }) => ({
	documents: many(documents)
}));
