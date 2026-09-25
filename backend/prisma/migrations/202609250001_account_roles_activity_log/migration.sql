-- Add the HSE operating roles without invalidating existing memberships.
ALTER TABLE `RolePermission`
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_SPECIALIST', 'HSE_OFFICER', 'EXTERNAL_AUDITOR', 'PERSONNEL', 'ASSESSOR', 'ASSISTANT', 'VIEWER') NOT NULL;

ALTER TABLE `OrganizationMember`
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_SPECIALIST', 'HSE_OFFICER', 'EXTERNAL_AUDITOR', 'PERSONNEL', 'ASSESSOR', 'ASSISTANT', 'VIEWER') NOT NULL;

ALTER TABLE `Invitation`
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_SPECIALIST', 'HSE_OFFICER', 'EXTERNAL_AUDITOR', 'PERSONNEL', 'ASSESSOR', 'ASSISTANT', 'VIEWER') NOT NULL;

-- Capture the request context needed by the consolidated activity log.
ALTER TABLE `AuditLog`
  ADD COLUMN `ipAddress` VARCHAR(64) NULL,
  ADD COLUMN `userAgent` TEXT NULL,
  ADD INDEX `AuditLog_entityType_entityId_createdAt_idx` (`entityType`, `entityId`, `createdAt`);
