CREATE TABLE `AIUsageRecord` (
    `id` VARCHAR(36) NOT NULL,
    `organizationId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `useCase` VARCHAR(32) NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `model` VARCHAR(128) NULL,
    `inputTokens` INT NOT NULL DEFAULT 0,
    `outputTokens` INT NOT NULL DEFAULT 0,
    `totalTokens` INT NOT NULL DEFAULT 0,
    `sourceType` VARCHAR(32) NOT NULL,
    `sourceId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AIUsageRecord_sourceType_sourceId_key`(`sourceType`, `sourceId`),
    INDEX `AIUsageRecord_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AIUsageRecord_organizationId_userId_createdAt_idx`(`organizationId`, `userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AIUsageRecord` ADD CONSTRAINT `AIUsageRecord_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AIUsageRecord` ADD CONSTRAINT `AIUsageRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
