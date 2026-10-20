-- Preserve usage, access decisions and custom quotas while raising the former default.
ALTER TABLE `User` ALTER COLUMN `aiTokenLimit` SET DEFAULT 1000000;
UPDATE `User` SET `aiTokenLimit` = 1000000 WHERE `aiTokenLimit` = 100000;
