ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `company` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `website` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `emailNotifications` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(100) DEFAULT 'UTC';