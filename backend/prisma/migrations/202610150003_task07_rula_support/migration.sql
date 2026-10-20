ALTER TABLE `SupportRequest`
  MODIFY COLUMN `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  ADD COLUMN `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN `assignedToId` VARCHAR(36) NULL,
  ADD COLUMN `relatedAssessmentType` ENUM('RULA', 'FMEA') NULL,
  ADD COLUMN `relatedAssessmentId` VARCHAR(36) NULL,
  ADD COLUMN `publicErrorCode` VARCHAR(80) NULL,
  ADD INDEX `SupportRequest_assignedToId_status_updatedAt_idx` (`assignedToId`, `status`, `updatedAt`),
  ADD INDEX `SupportRequest_organizationId_priority_updatedAt_idx` (`organizationId`, `priority`, `updatedAt`),
  ADD INDEX `SupportRequest_org_related_assessment_idx` (`organizationId`, `relatedAssessmentType`, `relatedAssessmentId`),
  ADD CONSTRAINT `SupportRequest_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SupportReply`
  ADD COLUMN `visibility` ENUM('PUBLIC', 'INTERNAL') NOT NULL DEFAULT 'PUBLIC';
