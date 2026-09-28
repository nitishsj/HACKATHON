ALTER TABLE `queueTickets` ADD `isDemo` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `smsDeliveryStatus` varchar(24) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `queueTickets` ADD `smsStatusUpdatedAt` timestamp;