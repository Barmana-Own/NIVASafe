-- Support fast self-activity reads while retaining organization-scoped history.
ALTER TABLE `AuditLog`
  ADD INDEX `AuditLog_userId_organizationId_createdAt_idx` (`userId`, `organizationId`, `createdAt`);
