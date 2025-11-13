CREATE TABLE `emailClicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sentEmailId` int NOT NULL,
	`leadId` int,
	`originalUrl` text NOT NULL,
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `emailClicks_id` PRIMARY KEY(`id`)
);
