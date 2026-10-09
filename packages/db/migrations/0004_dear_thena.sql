CREATE TABLE `contact_labels` (
	`contact_id` text NOT NULL,
	`label_id` text NOT NULL,
	PRIMARY KEY(`contact_id`, `label_id`),
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_labels_labelId_idx` ON `contact_labels` (`label_id`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_userId_name_unique` ON `labels` (`user_id`,`name`);--> statement-breakpoint
-- Hand-written: FTS5 index over contact names, notes, and interactions, kept in
-- sync by triggers (drizzle-kit cannot express virtual tables or triggers).
CREATE VIRTUAL TABLE `contacts_fts` USING fts5(`contact_id` UNINDEXED, `name`, `notes`, `interactions`, tokenize = 'unicode61');--> statement-breakpoint
INSERT INTO `contacts_fts` (`contact_id`, `name`, `notes`, `interactions`) SELECT `id`, `name`, coalesce((SELECT group_concat(`body`, ' ') FROM `notes` WHERE `notes`.`contact_id` = `contacts`.`id`), ''), coalesce((SELECT group_concat(`note`, ' ') FROM `interactions` WHERE `interactions`.`contact_id` = `contacts`.`id`), '') FROM `contacts`;--> statement-breakpoint
CREATE TRIGGER `contacts_fts_insert` AFTER INSERT ON `contacts` BEGIN INSERT INTO `contacts_fts` (`contact_id`, `name`, `notes`, `interactions`) VALUES (new.`id`, new.`name`, '', ''); END;--> statement-breakpoint
CREATE TRIGGER `contacts_fts_update` AFTER UPDATE OF `name` ON `contacts` BEGIN UPDATE `contacts_fts` SET `name` = new.`name` WHERE `contact_id` = new.`id`; END;--> statement-breakpoint
CREATE TRIGGER `contacts_fts_delete` AFTER DELETE ON `contacts` BEGIN DELETE FROM `contacts_fts` WHERE `contact_id` = old.`id`; END;--> statement-breakpoint
CREATE TRIGGER `notes_fts_insert` AFTER INSERT ON `notes` BEGIN UPDATE `contacts_fts` SET `notes` = (SELECT coalesce(group_concat(`body`, ' '), '') FROM `notes` WHERE `notes`.`contact_id` = new.`contact_id`) WHERE `contact_id` = new.`contact_id`; END;--> statement-breakpoint
CREATE TRIGGER `notes_fts_update` AFTER UPDATE OF `body` ON `notes` BEGIN UPDATE `contacts_fts` SET `notes` = (SELECT coalesce(group_concat(`body`, ' '), '') FROM `notes` WHERE `notes`.`contact_id` = new.`contact_id`) WHERE `contact_id` = new.`contact_id`; END;--> statement-breakpoint
CREATE TRIGGER `notes_fts_delete` AFTER DELETE ON `notes` BEGIN UPDATE `contacts_fts` SET `notes` = (SELECT coalesce(group_concat(`body`, ' '), '') FROM `notes` WHERE `notes`.`contact_id` = old.`contact_id`) WHERE `contact_id` = old.`contact_id`; END;--> statement-breakpoint
CREATE TRIGGER `interactions_fts_insert` AFTER INSERT ON `interactions` BEGIN UPDATE `contacts_fts` SET `interactions` = (SELECT coalesce(group_concat(`note`, ' '), '') FROM `interactions` WHERE `interactions`.`contact_id` = new.`contact_id`) WHERE `contact_id` = new.`contact_id`; END;--> statement-breakpoint
CREATE TRIGGER `interactions_fts_update` AFTER UPDATE OF `note` ON `interactions` BEGIN UPDATE `contacts_fts` SET `interactions` = (SELECT coalesce(group_concat(`note`, ' '), '') FROM `interactions` WHERE `interactions`.`contact_id` = new.`contact_id`) WHERE `contact_id` = new.`contact_id`; END;--> statement-breakpoint
CREATE TRIGGER `interactions_fts_delete` AFTER DELETE ON `interactions` BEGIN UPDATE `contacts_fts` SET `interactions` = (SELECT coalesce(group_concat(`note`, ' '), '') FROM `interactions` WHERE `interactions`.`contact_id` = old.`contact_id`) WHERE `contact_id` = old.`contact_id`; END;