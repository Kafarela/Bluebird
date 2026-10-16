CREATE TABLE `owner_claims` (
	`id` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_claims_ownerUserId_unique` UNIQUE(`ownerUserId`)
);
