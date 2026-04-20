import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// --- Organizational Structure ---

export const departments = sqliteTable('departments', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull()
});

export const groups = sqliteTable('groups', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	departmentId: text('department_id').references(() => departments.id, { onDelete: 'cascade' })
});

// --- Identity & Access ---

export const users = sqliteTable('users', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	level: text('level', { enum: ['manager', 'staff'] }).notNull().default('staff'),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	isCompliance: integer('is_compliance', { mode: 'boolean' }).notNull().default(false)
});

export const usersToGroups = sqliteTable('users_to_groups', {
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' })
}, (t) => ({
	pk: primaryKey({ columns: [t.userId, t.groupId] })
}));

// --- Document Intelligence ---

export const documents = sqliteTable('documents', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	s3Key: text('s3_key').notNull(),
	ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'set null' }),
	groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
	classification: text('classification').notNull().default('INTERNAL'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// --- Auditing (SOC2/GDPR) ---

export const auditLogs = sqliteTable('audit_logs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
	event: text('event').notNull(),
	timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	metadata: text('metadata') // JSON string
});

// --- Relations ---

export const departmentsRelations = relations(departments, ({ many }) => ({
	groups: many(groups)
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
	department: one(departments, {
		fields: [groups.departmentId],
		references: [departments.id]
	}),
	users: many(usersToGroups)
}));

export const usersRelations = relations(users, ({ many }) => ({
	groups: many(usersToGroups),
	documents: many(documents)
}));

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
	user: one(users, {
		fields: [usersToGroups.userId],
		references: [users.id]
	}),
	group: one(groups, {
		fields: [usersToGroups.groupId],
		references: [groups.id]
	})
}));
