-- NIVASafe MySQL 8 / MariaDB 10.6+ initial schema
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `User` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `globalRole` ENUM('USER', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `lastLoginAt` DATETIME(3) NULL,
  `locale` VARCHAR(191) NOT NULL DEFAULT 'fa',
  `phone` VARCHAR(191) NULL,
  `jobTitle` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Session` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Session_tokenHash_key` (`tokenHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PasswordResetToken` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PasswordResetToken_tokenHash_key` (`tokenHash`),
  KEY `PasswordResetToken_userId_expiresAt_idx` (`userId`, `expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Permission` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Permission_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RolePermission` (
  `id` VARCHAR(36) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL,
  `permissionId` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `RolePermission_role_permissionId_key` (`role`, `permissionId`),
  KEY `RolePermission_role_idx` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Organization` (
  `id` VARCHAR(36) NOT NULL,
  `nameFa` VARCHAR(191) NOT NULL,
  `nameEn` VARCHAR(191) NOT NULL,
  `nationalId` VARCHAR(191) NULL,
  `industry` VARCHAR(191) NULL,
  `employeeCount` INT NULL,
  `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Tehran',
  `defaultLocale` VARCHAR(191) NOT NULL DEFAULT 'fa',
  `riskMedium` INT NOT NULL DEFAULT 101,
  `riskHigh` INT NOT NULL DEFAULT 201,
  `riskCritical` INT NOT NULL DEFAULT 401,
  `subscriptionPlan` VARCHAR(32) NOT NULL DEFAULT 'STARTER',
  `subscriptionStatus` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `subscriptionProvider` VARCHAR(32) NOT NULL DEFAULT 'legacy',
  `subscriptionStartedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `subscriptionExpiresAt` DATETIME(3) NULL,
  `subscriptionExternalId` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Organization_nationalId_key` (`nationalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OrganizationMember` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `OrganizationMember_organizationId_userId_key` (`organizationId`, `userId`),
  KEY `OrganizationMember_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Invitation` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Invitation_tokenHash_key` (`tokenHash`),
  KEY `Invitation_organizationId_email_idx` (`organizationId`, `email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Project` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `description` TEXT NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Project_organizationId_code_key` (`organizationId`, `code`),
  KEY `Project_organizationId_idx` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Process` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `projectId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `parentId` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Process_organizationId_projectId_idx` (`organizationId`, `projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Activity` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `projectId` VARCHAR(36) NOT NULL,
  `processId` VARCHAR(36) NULL,
  `title` VARCHAR(191) NOT NULL,
  `jobTitle` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `hazards` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Activity_organizationId_projectId_idx` (`organizationId`, `projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `JobCatalog` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NULL,
  `titleFa` VARCHAR(191) NOT NULL,
  `titleEn` VARCHAR(191) NOT NULL,
  `keywords` JSON NULL,
  `departmentFa` VARCHAR(191) NULL,
  `departmentEn` VARCHAR(191) NULL,
  `descriptionFa` TEXT NULL,
  `descriptionEn` TEXT NULL,
  `equipment` JSON NOT NULL,
  `materials` JSON NOT NULL,
  `controls` JSON NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `JobCatalog_organizationId_active_idx` (`organizationId`, `active`),
  KEY `JobCatalog_titleFa_idx` (`titleFa`),
  KEY `JobCatalog_titleEn_idx` (`titleEn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `FmeaAssessment` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `projectId` VARCHAR(36) NOT NULL,
  `activityId` VARCHAR(36) NULL,
  `jobCatalogId` VARCHAR(36) NULL,
  `title` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `scope` TEXT NULL,
  `department` VARCHAR(191) NULL,
  `activityDescription` TEXT NULL,
  `equipment` JSON NULL,
  `materials` JSON NULL,
  `existingControls` JSON NULL,
  `specialConditions` TEXT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `approvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `fmeaDetailSeededAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `FmeaAssessment_organizationId_code_version_key` (`organizationId`, `code`, `version`),
  KEY `FmeaAssessment_organizationId_projectId_idx` (`organizationId`, `projectId`),
  KEY `FmeaAssessment_jobCatalogId_idx` (`jobCatalogId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `FmeaVersion` (
  `id` VARCHAR(36) NOT NULL,
  `assessmentId` VARCHAR(36) NOT NULL,
  `version` INT NOT NULL,
  `snapshot` JSON NOT NULL,
  `createdBy` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `FmeaVersion_assessmentId_version_key` (`assessmentId`, `version`),
  KEY `FmeaVersion_assessmentId_createdAt_idx` (`assessmentId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `FmeaItem` (
  `id` VARCHAR(36) NOT NULL,
  `assessmentId` VARCHAR(36) NOT NULL,
  `rowNumber` INT NOT NULL,
  `processStep` TEXT NOT NULL,
  `failureMode` TEXT NOT NULL,
  `effect` TEXT NOT NULL,
  `cause` TEXT NOT NULL,
  `preventiveControls` TEXT NULL,
  `detectionControls` TEXT NULL,
  `severity` INT NOT NULL,
  `occurrence` INT NOT NULL,
  `detection` INT NOT NULL,
  `rpn` INT NOT NULL,
  `riskLevel` ENUM('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
  `recommendation` TEXT NULL,
  `residualSeverity` INT NULL,
  `residualOccurrence` INT NULL,
  `residualDetection` INT NULL,
  `residualRpn` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FmeaItem_assessmentId_idx` (`assessmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RulaAssessment` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `projectId` VARCHAR(36) NOT NULL,
  `activityId` VARCHAR(36) NULL,
  `title` VARCHAR(191) NOT NULL,
  `subjectCode` VARCHAR(191) NULL,
  `bodySide` VARCHAR(191) NOT NULL DEFAULT 'RIGHT',
  `inputs` JSON NOT NULL,
  `activityInfo` JSON NULL,
  `postureAnalysis` JSON NULL,
  `score` INT NOT NULL,
  `actionLevel` INT NOT NULL,
  `explanation` TEXT NOT NULL,
  `status` ENUM('DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `version` INT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `RulaAssessment_organizationId_projectId_idx` (`organizationId`, `projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RulaVersion` (
  `id` VARCHAR(36) NOT NULL,
  `assessmentId` VARCHAR(36) NOT NULL,
  `version` INT NOT NULL,
  `snapshot` JSON NOT NULL,
  `createdBy` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `RulaVersion_assessmentId_version_key` (`assessmentId`, `version`),
  KEY `RulaVersion_assessmentId_createdAt_idx` (`assessmentId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `CorrectiveAction` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `projectId` VARCHAR(36) NOT NULL,
  `fmeaId` VARCHAR(36) NULL,
  `fmeaItemId` VARCHAR(36) NULL,
  `rulaId` VARCHAR(36) NULL,
  `bodySide` VARCHAR(10) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_REVIEW', 'COMPLETED', 'REJECTED', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `progress` INT NOT NULL DEFAULT 0,
  `assigneeName` VARCHAR(191) NULL,
  `dueDate` DATETIME(3) NULL,
  `beforeRisk` INT NULL,
  `afterRisk` INT NULL,
  `rulaImpact` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `CorrectiveAction_organizationId_status_idx` (`organizationId`, `status`),
  KEY `CorrectiveAction_fmeaItemId_idx` (`fmeaItemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `KnowledgeDocument` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `tags` JSON NOT NULL,
  `published` BOOLEAN NOT NULL DEFAULT TRUE,
  `aiReadable` BOOLEAN NOT NULL DEFAULT TRUE,
  `aiOnly` BOOLEAN NOT NULL DEFAULT FALSE,
  `isGlobal` BOOLEAN NOT NULL DEFAULT FALSE,
  `visibility` VARCHAR(191) NOT NULL DEFAULT 'ALL',
  `visibleUserIds` JSON NULL,
  `visibleOrganizationIds` JSON NULL,
  `version` INT NOT NULL DEFAULT 1,
  `categoryId` VARCHAR(36) NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `KnowledgeDocument_organizationId_idx` (`organizationId`),
  KEY `KnowledgeDocument_isGlobal_published_deletedAt_idx` (`isGlobal`, `published`, `deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `KnowledgeCategory` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `KnowledgeCategory_organizationId_name_key` (`organizationId`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Attachment` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `uploadedById` VARCHAR(36) NOT NULL,
  `kind` ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `objectKey` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `size` INT NOT NULL,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `checksum` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Attachment_objectKey_key` (`objectKey`),
  KEY `Attachment_organizationId_entityType_entityId_idx` (`organizationId`, `entityType`, `entityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `link` TEXT NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_userId_readAt_idx` (`userId`, `readAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `NotificationPreference` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `emailEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `pushEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `riskAlerts` BOOLEAN NOT NULL DEFAULT TRUE,
  `dueReminders` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `NotificationPreference_organizationId_userId_key` (`organizationId`, `userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `EmailOutbox` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` INT NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `nextAttemptAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `EmailOutbox_status_nextAttemptAt_idx` (`status`, `nextAttemptAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AIAnalysisRequest` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL DEFAULT 'fallback',
  `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'WAITING_FOR_PROVIDER', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `input` JSON NOT NULL,
  `output` JSON NULL,
  `error` TEXT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `AIAnalysisRequest_organizationId_status_availableAt_idx` (`organizationId`, `status`, `availableAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  PRIMARY KEY (`id`),
  UNIQUE KEY `AIUsageRecord_sourceType_sourceId_key` (`sourceType`, `sourceId`),
  KEY `AIUsageRecord_userId_createdAt_idx` (`userId`, `createdAt`),
  KEY `AIUsageRecord_organizationId_userId_createdAt_idx` (`organizationId`, `userId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ChatConversation` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(36) NULL,
  `archivedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ChatConversation_organizationId_userId_updatedAt_idx` (`organizationId`, `userId`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ChatMessage` (
  `id` VARCHAR(36) NOT NULL,
  `conversationId` VARCHAR(36) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `citations` JSON NULL,
  `provider` VARCHAR(191) NULL,
  `feedback` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ChatMessage_conversationId_createdAt_idx` (`conversationId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NULL,
  `organizationId` VARCHAR(36) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `requestId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuditLog_organizationId_createdAt_idx` (`organizationId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Project` ADD CONSTRAINT `Project_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Process` ADD CONSTRAINT `Process_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Process` ADD CONSTRAINT `Process_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `Process` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `JobCatalog` ADD CONSTRAINT `JobCatalog_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FmeaAssessment` ADD CONSTRAINT `FmeaAssessment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FmeaAssessment` ADD CONSTRAINT `FmeaAssessment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FmeaAssessment` ADD CONSTRAINT `FmeaAssessment_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FmeaAssessment` ADD CONSTRAINT `FmeaAssessment_jobCatalogId_fkey` FOREIGN KEY (`jobCatalogId`) REFERENCES `JobCatalog` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FmeaVersion` ADD CONSTRAINT `FmeaVersion_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `FmeaAssessment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FmeaItem` ADD CONSTRAINT `FmeaItem_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `FmeaAssessment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RulaAssessment` ADD CONSTRAINT `RulaAssessment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RulaAssessment` ADD CONSTRAINT `RulaAssessment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RulaAssessment` ADD CONSTRAINT `RulaAssessment_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RulaVersion` ADD CONSTRAINT `RulaVersion_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `RulaAssessment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CorrectiveAction` ADD CONSTRAINT `CorrectiveAction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CorrectiveAction` ADD CONSTRAINT `CorrectiveAction_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CorrectiveAction` ADD CONSTRAINT `CorrectiveAction_fmeaId_fkey` FOREIGN KEY (`fmeaId`) REFERENCES `FmeaAssessment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CorrectiveAction` ADD CONSTRAINT `CorrectiveAction_fmeaItemId_fkey` FOREIGN KEY (`fmeaItemId`) REFERENCES `FmeaItem` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CorrectiveAction` ADD CONSTRAINT `CorrectiveAction_rulaId_fkey` FOREIGN KEY (`rulaId`) REFERENCES `RulaAssessment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `KnowledgeDocument` ADD CONSTRAINT `KnowledgeDocument_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `KnowledgeDocument` ADD CONSTRAINT `KnowledgeDocument_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `KnowledgeCategory` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `KnowledgeCategory` ADD CONSTRAINT `KnowledgeCategory_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `EmailOutbox` ADD CONSTRAINT `EmailOutbox_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AIAnalysisRequest` ADD CONSTRAINT `AIAnalysisRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AIAnalysisRequest` ADD CONSTRAINT `AIAnalysisRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AIUsageRecord` ADD CONSTRAINT `AIUsageRecord_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AIUsageRecord` ADD CONSTRAINT `AIUsageRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ChatConversation` ADD CONSTRAINT `ChatConversation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ChatConversation` ADD CONSTRAINT `ChatConversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `ChatConversation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
