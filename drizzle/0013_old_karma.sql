ALTER TABLE `users` ADD `notifyOnSuccess` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `notifyOnFailure` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `notifyOnPartial` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `batchNotifications` int DEFAULT 0;