CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeInvoiceId` varchar(255) NOT NULL,
	`stripeCustomerId` varchar(255) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` enum('draft','open','paid','void','uncollectible') NOT NULL DEFAULT 'open',
	`paidAt` timestamp,
	`dueDate` timestamp,
	`description` text,
	`receiptUrl` varchar(500),
	`downloadUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_stripeInvoiceId_unique` UNIQUE(`stripeInvoiceId`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(255) NOT NULL,
	`stripeCustomerId` varchar(255) NOT NULL,
	`invoiceId` int,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` enum('requires_payment_method','requires_confirmation','requires_action','processing','requires_capture','canceled','succeeded') NOT NULL DEFAULT 'requires_payment_method',
	`paymentMethodType` varchar(50),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_stripePaymentIntentId_unique` UNIQUE(`stripePaymentIntentId`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`tier` enum('free','basic','pro','enterprise') NOT NULL,
	`description` text,
	`monthlyPrice` int NOT NULL,
	`yearlyPrice` int NOT NULL,
	`stripePriceIdMonthly` varchar(255),
	`stripePriceIdYearly` varchar(255),
	`features` text,
	`maxLeads` int,
	`maxEmails` int,
	`maxSequences` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptionPlans_tier_unique` UNIQUE(`tier`)
);
