CREATE TABLE `campaign_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uid` varchar(64) NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text,
	`theme` varchar(32) DEFAULT 'classic',
	`wallpaper` text,
	`inviteToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaigns_uid_unique` UNIQUE(`uid`),
	CONSTRAINT `campaigns_inviteToken_unique` UNIQUE(`inviteToken`)
);
--> statement-breakpoint
CREATE TABLE `character_attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`label` varchar(128) NOT NULL,
	`value` int DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `character_attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`quantity` int DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `character_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`label` varchar(128) NOT NULL,
	`current` int DEFAULT 0,
	`max` int DEFAULT 100,
	`color` varchar(32) DEFAULT '#ef4444',
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `character_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`permission` enum('view','edit') NOT NULL DEFAULT 'view',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `character_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `character_shares_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `character_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `character_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uid` varchar(64) NOT NULL,
	`ownerId` int NOT NULL,
	`campaignId` int,
	`name` varchar(255) DEFAULT 'Novo Personagem',
	`playerName` varchar(255),
	`imageUrl` text,
	`wallpaperUrl` text,
	`wallpaperOpacity` float DEFAULT 0.3,
	`theme` varchar(32) DEFAULT 'classic',
	`rpgSystem` varchar(128),
	`basicInfo` json,
	`levelLabel` varchar(64) DEFAULT 'Nível',
	`levelValue` varchar(64) DEFAULT '1',
	`classLabel` varchar(64) DEFAULT 'Classe',
	`classValue` varchar(255),
	`originLabel` varchar(64) DEFAULT 'Origem',
	`originValue` varchar(255),
	`loreLabel` varchar(64) DEFAULT 'História & Anotações',
	`loreContent` text,
	`loreVisible` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`),
	CONSTRAINT `characters_uid_unique` UNIQUE(`uid`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `globalTheme` varchar(32) DEFAULT 'classic';--> statement-breakpoint
ALTER TABLE `users` ADD `globalWallpaper` text;