CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`default_cadence_days` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `cadence_days` integer;--> statement-breakpoint
ALTER TABLE `contacts` ADD `cadence_tracked` integer DEFAULT true NOT NULL;