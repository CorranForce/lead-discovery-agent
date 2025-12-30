CREATE TABLE `scheduledJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobType` varchar(100) NOT NULL DEFAULT 'reengagement',
	`cronExpression` varchar(100) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`lastExecutedAt` timestamp,
	`nextExecutionAt` timestamp,
	`totalExecutions` int DEFAULT 0,
	`successfulExecutions` int DEFAULT 0,
	`failedExecutions` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduledJobs_id` PRIMARY KEY(`id`)
);
