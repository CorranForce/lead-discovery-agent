CREATE TABLE `emailSequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isActive` int DEFAULT 1,
	`triggerType` enum('manual','status_change','time_based') DEFAULT 'manual',
	`triggerCondition` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequenceEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`leadId` int NOT NULL,
	`currentStep` int DEFAULT 0,
	`status` enum('active','completed','paused','failed') DEFAULT 'active',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`lastEmailSentAt` timestamp,
	`nextEmailScheduledAt` timestamp,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sequenceEnrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequenceSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`templateId` int,
	`subject` varchar(500),
	`body` text,
	`delayDays` int DEFAULT 0,
	`delayHours` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sequenceSteps_id` PRIMARY KEY(`id`)
);
