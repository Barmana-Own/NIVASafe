ALTER TABLE `User` ADD COLUMN `aiEnabled` BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN `aiTokenLimit` INTEGER NOT NULL DEFAULT 100000,
 ADD COLUMN `aiTokensUsed` INTEGER NOT NULL DEFAULT 0;
UPDATE `User` u LEFT JOIN (SELECT userId, SUM(totalTokens) tokens FROM AIUsageRecord GROUP BY userId) a ON a.userId=u.id SET u.aiTokensUsed=LEAST(COALESCE(a.tokens,0),2147483647);
CREATE TABLE `AIQuotaReservation` (
 `id` VARCHAR(36) NOT NULL, `userId` VARCHAR(36) NOT NULL,
 `tokens` INTEGER NOT NULL, `expiresAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), INDEX `AIQuotaReservation_userId_expiresAt_idx` (`userId`,`expiresAt`),
 CONSTRAINT `AIQuotaReservation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
