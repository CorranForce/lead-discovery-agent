ALTER TABLE `users` ADD `hasPaymentMethod` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `paymentMethodId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `trialExpirationNotificationSentAt` timestamp;