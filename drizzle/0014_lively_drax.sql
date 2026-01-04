ALTER TABLE `users` ADD `accountStatus` enum('active','inactive','suspended','trial') DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','basic','pro','enterprise') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `billingCycle` enum('monthly','yearly','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `nextBillingDate` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `accountActivatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `accountDeactivatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `trialEndsAt` timestamp;