CREATE TABLE `reengagementExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`leadsDetected` int NOT NULL,
	`leadsEnrolled` int NOT NULL,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','failed','partial') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	CONSTRAINT `reengagementExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reengagementWorkflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`inactivityDays` int NOT NULL,
	`sequenceId` int,
	`isActive` int NOT NULL DEFAULT 1,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reengagementWorkflows_id` PRIMARY KEY(`id`)
);
