-- Store the anatomical side targeted by corrective actions linked to RULA.
ALTER TABLE `CorrectiveAction`
  ADD COLUMN `bodySide` VARCHAR(10) NULL;

-- Preserve the scope of existing RULA actions before the field becomes part of
-- the action API. FMEA and standalone actions intentionally remain nullable.
UPDATE `CorrectiveAction` AS `ca`
INNER JOIN `RulaAssessment` AS `rula` ON `rula`.`id` = `ca`.`rulaId`
SET `ca`.`bodySide` = `rula`.`bodySide`
WHERE `ca`.`bodySide` IS NULL;
