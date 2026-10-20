ALTER TABLE `User`
  ADD COLUMN `aiQuotaCycle` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `CorrectiveAction`
  ADD COLUMN `createRequestHash` CHAR(64) NULL;

CREATE TABLE `SupportRequest` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `requesterId` VARCHAR(36) NOT NULL,
  `responderId` VARCHAR(36) NULL,
  `idempotencyKey` VARCHAR(36) NOT NULL,
  `category` ENUM('AI_QUOTA', 'PROFESSIONAL_PLAN', 'TECHNICAL_SUPPORT', 'OTHER') NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `response` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `resolvedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SupportRequest_org_requester_idempotency_key` (`organizationId`, `requesterId`, `idempotencyKey`),
  INDEX `SupportRequest_organizationId_status_createdAt_idx` (`organizationId`, `status`, `createdAt`),
  INDEX `SupportRequest_requesterId_createdAt_idx` (`requesterId`, `createdAt`),
  CONSTRAINT `SupportRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SupportRequest_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SupportRequest_responderId_fkey` FOREIGN KEY (`responderId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FmeaSuggestionDismissal` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `assessmentId` VARCHAR(36) NOT NULL,
  `fmeaItemId` VARCHAR(36) NOT NULL,
  `suggestionKey` CHAR(64) NOT NULL,
  `title` VARCHAR(240) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FmeaSuggestionDismissal_scope_key` (`organizationId`, `userId`, `assessmentId`, `suggestionKey`),
  INDEX `FmeaSuggestionDismissal_org_assessment_user_idx` (`organizationId`, `assessmentId`, `userId`),
  CONSTRAINT `FmeaSuggestionDismissal_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FmeaSuggestionDismissal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FmeaSuggestionDismissal_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `FmeaAssessment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FmeaSuggestionDismissal_fmeaItemId_fkey` FOREIGN KEY (`fmeaItemId`) REFERENCES `FmeaItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
