ALTER TABLE `queueTickets` ADD `patientPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `preferredLanguage` enum('en','hi','ta','te') DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `smsOptIn` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `approachingSmsClaimedAt` timestamp;--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `smsApproachingSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `twilioMessageSid` varchar(34);--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `smsLastErrorCode` varchar(16);