CREATE TABLE `important_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`name` text NOT NULL,
	`falls_on` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `important_dates_userId_idx` ON `important_dates` (`user_id`);--> statement-breakpoint
CREATE INDEX `important_dates_contactId_idx` ON `important_dates` (`contact_id`);--> statement-breakpoint
INSERT INTO `important_dates` (`id`, `user_id`, `contact_id`, `name`, `falls_on`, `source`, `created_at`, `updated_at`)
SELECT lower(hex(randomblob(16))), `user_id`, `id`, 'Birthday', `birthday`, 'birthday', (cast(unixepoch('subsecond') * 1000 as integer)), (cast(unixepoch('subsecond') * 1000 as integer))
FROM `contacts`
WHERE `birthday` IS NOT NULL;