CREATE TABLE `interaction_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`interaction_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interaction_id`) REFERENCES `interactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interaction_attachments_userId_idx` ON `interaction_attachments` (`user_id`);--> statement-breakpoint
CREATE INDEX `interaction_attachments_interactionId_idx` ON `interaction_attachments` (`interaction_id`);--> statement-breakpoint
CREATE INDEX `interaction_attachments_contactId_idx` ON `interaction_attachments` (`contact_id`);--> statement-breakpoint
ALTER TABLE `contacts` ADD `location` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `role_company` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `timezone` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `photo_key` text;