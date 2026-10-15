CREATE TABLE `group_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`author` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `group_messages_room_created` ON `group_messages` (`group_id`,`created`);--> statement-breakpoint
CREATE TABLE `group_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`owner_name` text NOT NULL,
	`guest` text,
	`guest_name` text,
	`title` text NOT NULL,
	`characters` text NOT NULL,
	`snapshots` text NOT NULL,
	`invite` text NOT NULL,
	`owner_persona` text,
	`guest_persona` text,
	`updated` text NOT NULL,
	`generation` text,
	`generation_user` text,
	`generation_until` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_rooms_invite_unique` ON `group_rooms` (`invite`);--> statement-breakpoint
CREATE INDEX `group_rooms_owner` ON `group_rooms` (`owner`);--> statement-breakpoint
CREATE INDEX `group_rooms_guest` ON `group_rooms` (`guest`);