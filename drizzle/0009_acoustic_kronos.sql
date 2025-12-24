CREATE TABLE `emailOpens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sentEmailId` int NOT NULL,
	`leadId` int,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `emailOpens_id` PRIMARY KEY(`id`)
);
