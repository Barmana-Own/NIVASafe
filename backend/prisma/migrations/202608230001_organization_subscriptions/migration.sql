ALTER TABLE `Organization`
  ADD COLUMN `subscriptionPlan` VARCHAR(32) NOT NULL DEFAULT 'STARTER',
  ADD COLUMN `subscriptionStatus` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `subscriptionProvider` VARCHAR(32) NOT NULL DEFAULT 'legacy',
  ADD COLUMN `subscriptionStartedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `subscriptionExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionExternalId` VARCHAR(191) NULL;
