-- Move SUPER_ADMIN from organization membership to a global User role.
ALTER TABLE `User`
  ADD COLUMN `globalRole` ENUM('USER', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER' AFTER `active`;

-- Preserve any existing SUPER_ADMIN assignments before removing that enum value.
UPDATE `User` AS `u`
INNER JOIN `OrganizationMember` AS `m` ON `m`.`userId` = `u`.`id`
SET `u`.`globalRole` = 'SUPER_ADMIN'
WHERE `m`.`role` = 'SUPER_ADMIN';

-- The built-in administrator must always be the global super administrator.
UPDATE `User`
SET `globalRole` = 'SUPER_ADMIN'
WHERE LOWER(`email`) = 'admin@nivasafe.local';

-- SUPER_ADMIN is no longer a tenant/member role. Existing rows are downgraded
-- to ORG_ADMIN so no organization loses its local administrator during upgrade.
UPDATE `OrganizationMember`
SET `role` = 'ORG_ADMIN'
WHERE `role` = 'SUPER_ADMIN';

UPDATE `Invitation`
SET `role` = 'ORG_ADMIN'
WHERE `role` = 'SUPER_ADMIN';

DELETE FROM `RolePermission`
WHERE `role` = 'SUPER_ADMIN';

ALTER TABLE `OrganizationMember`
  MODIFY `role` ENUM('ORG_ADMIN', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL;

ALTER TABLE `Invitation`
  MODIFY `role` ENUM('ORG_ADMIN', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL;

ALTER TABLE `RolePermission`
  MODIFY `role` ENUM('ORG_ADMIN', 'HSE_MANAGER', 'ASSESSOR', 'VIEWER') NOT NULL;
