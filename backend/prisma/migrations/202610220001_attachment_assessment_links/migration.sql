-- Additive associations retain canonical library files and legacy primary references.
CREATE TABLE `AttachmentAssessmentLink` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL,
  `attachmentId` VARCHAR(36) NOT NULL,
  `entityType` ENUM('FmeaAssessment', 'RulaAssessment') NOT NULL,
  `entityId` VARCHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `AttachmentAssessmentLink_attachment_target_key` (`attachmentId`, `entityType`, `entityId`),
  KEY `AttachmentAssessmentLink_organization_target_idx` (`organizationId`, `entityType`, `entityId`),
  CONSTRAINT `AttachmentAssessmentLink_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `AttachmentAssessmentLink_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
