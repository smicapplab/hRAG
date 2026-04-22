CREATE TABLE `node_heartbeats` (
	`node_id` text PRIMARY KEY NOT NULL,
	`hostname` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`metrics` text NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `classification_policies` ADD `severity_weight` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `classification_policies` ADD `description` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `ai_classification` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `ai_override` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `review_status` text;