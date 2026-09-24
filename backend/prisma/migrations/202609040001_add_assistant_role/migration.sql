-- Add the organization-level assistant role for administrator-managed invitations.
ALTER TABLE `RolePermission`
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'ASSISTANT', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL;

ALTER TABLE `OrganizationMember`
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'ASSISTANT', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL;

ALTER TABLE `Invitation`
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'ASSISTANT', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL;
