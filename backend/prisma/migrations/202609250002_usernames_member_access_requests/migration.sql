-- Add optional login usernames while preserving existing email-only accounts.
ALTER TABLE `User`
  ADD COLUMN `username` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `User_username_key` (`username`);

-- Organization managers submit membership requests for super-admin approval.
CREATE TABLE `MemberAccessRequest` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `requestedById` VARCHAR(36) NOT NULL,
  `reviewedById` VARCHAR(36) NULL,
  `provisionedUserId` VARCHAR(36) NULL,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `jobTitle` VARCHAR(191) NULL,
  `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_SPECIALIST', 'HSE_OFFICER', 'EXTERNAL_AUDITOR', 'PERSONNEL', 'ASSESSOR', 'ASSISTANT', 'VIEWER') NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejectionReason` TEXT NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MemberAccessRequest_provisionedUserId_key` (`provisionedUserId`),
  INDEX `MemberAccessRequest_organizationId_status_createdAt_idx` (`organizationId`, `status`, `createdAt`),
  INDEX `MemberAccessRequest_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `MemberAccessRequest_username_idx` (`username`),
  INDEX `MemberAccessRequest_email_idx` (`email`),
  CONSTRAINT `MemberAccessRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MemberAccessRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `MemberAccessRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `MemberAccessRequest_provisionedUserId_fkey` FOREIGN KEY (`provisionedUserId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
