-- Custom migration to handle hierarchy and data migration

CREATE TABLE `classification_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`display_name` text NOT NULL,
	`min_role_required` text DEFAULT 'VIEWER' NOT NULL,
	`requires_audit` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classification_policies_code_unique` ON `classification_policies` (`code`);
--> statement-breakpoint

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

CREATE TABLE `__new_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`level` integer DEFAULT 1 NOT NULL,
	`path` text,
	FOREIGN KEY (`parent_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- 1. Insert Departments as L1 Groups
INSERT INTO `__new_groups` (id, name, parent_id, level, path)
SELECT id, name, NULL, 1, id FROM departments;
--> statement-breakpoint

-- 2. Insert existing Groups as L2 Groups
INSERT INTO `__new_groups` (id, name, parent_id, level, path)
SELECT id, name, department_id, 2, department_id || '/' || id FROM groups;
--> statement-breakpoint

DROP TABLE `departments`;
--> statement-breakpoint
DROP TABLE `groups`;
--> statement-breakpoint
ALTER TABLE `__new_groups` RENAME TO `groups`;
--> statement-breakpoint

-- Update users (standard drizzle pattern for dropping columns in SQLite involves temp tables, but we'll try simple ADD first)
-- If we need to drop 'level', we'll do it via temp table
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`is_compliance` integer DEFAULT false NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users` (id, email, name, password_hash, is_admin, is_compliance)
SELECT id, email, name, password_hash, is_admin, is_compliance FROM users;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint

-- Update users_to_groups
CREATE TABLE `__new_users_to_groups` (
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`granted_by` text,
	`granted_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `group_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_users_to_groups` (user_id, group_id, role, granted_at)
SELECT user_id, group_id, 'VIEWER', (strftime('%s','now') * 1000) FROM users_to_groups;
--> statement-breakpoint
DROP TABLE `users_to_groups`;
--> statement-breakpoint
ALTER TABLE `__new_users_to_groups` RENAME TO `users_to_groups`;
--> statement-breakpoint

PRAGMA foreign_keys=ON;
