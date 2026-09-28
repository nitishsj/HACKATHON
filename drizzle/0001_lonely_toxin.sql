CREATE TABLE `queueEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`eventType` varchar(32) NOT NULL,
	`previousStatus` varchar(32),
	`nextStatus` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queueEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queueTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessKey` varchar(64) NOT NULL,
	`patientName` varchar(80) NOT NULL,
	`status` enum('waiting','called','in_consultation','completed','no_show') NOT NULL DEFAULT 'waiting',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`queuedAt` timestamp NOT NULL DEFAULT (now()),
	`calledAt` timestamp,
	`consultationStartedAt` timestamp,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queueTickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `queueTickets_accessKey_unique` UNIQUE(`accessKey`)
);
--> statement-breakpoint
ALTER TABLE `queueEvents` ADD CONSTRAINT `queueEvents_ticketId_queueTickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `queueTickets`(`id`) ON DELETE cascade ON UPDATE no action;