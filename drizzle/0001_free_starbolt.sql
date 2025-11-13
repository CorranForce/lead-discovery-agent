CREATE TABLE `enrichmentData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`dataType` varchar(100) NOT NULL,
	`dataKey` varchar(255) NOT NULL,
	`dataValue` text NOT NULL,
	`source` varchar(255),
	`confidence` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrichmentData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`website` varchar(500),
	`industry` varchar(255),
	`companySize` varchar(100),
	`location` varchar(255),
	`description` text,
	`contactName` varchar(255),
	`contactTitle` varchar(255),
	`contactEmail` varchar(320),
	`contactLinkedin` varchar(500),
	`contactPhone` varchar(50),
	`status` enum('new','contacted','qualified','unqualified','converted') NOT NULL DEFAULT 'new',
	`score` int DEFAULT 0,
	`notes` text,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` text NOT NULL,
	`filters` text,
	`resultsCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchHistory_id` PRIMARY KEY(`id`)
);
