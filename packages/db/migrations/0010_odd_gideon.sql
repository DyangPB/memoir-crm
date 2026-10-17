CREATE TABLE `google_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`memoir_calendar_id` text NOT NULL,
	`selected_calendar_ids` text DEFAULT '[]' NOT NULL,
	`sync_token` text,
	`last_synced_at` integer,
	`last_error` text,
	`sync_locked_until` integer,
	`resync_requested` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_event_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_id` text NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`remote_updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_event_links_item_idx` ON `google_event_links` (`user_id`,`kind`,`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_event_links_event_idx` ON `google_event_links` (`user_id`,`event_id`);