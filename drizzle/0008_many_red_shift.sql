ALTER TABLE `searchHistory` ADD `industry` varchar(255);--> statement-breakpoint
ALTER TABLE `searchHistory` ADD `companySize` varchar(100);--> statement-breakpoint
ALTER TABLE `searchHistory` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `searchHistory` ADD `isFavorite` int DEFAULT 0 NOT NULL;