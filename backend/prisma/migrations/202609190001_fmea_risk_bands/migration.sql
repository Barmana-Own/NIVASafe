-- Align FMEA risk classification with the supplied reference bands:
-- VERY_LOW 1-50, LOW 51-100, MEDIUM 101-200, HIGH 201-400, CRITICAL >400.
ALTER TABLE `FmeaItem`
  MODIFY COLUMN `riskLevel` ENUM('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL;

ALTER TABLE `Organization`
  MODIFY COLUMN `riskMedium` INT NOT NULL DEFAULT 101,
  MODIFY COLUMN `riskHigh` INT NOT NULL DEFAULT 201,
  MODIFY COLUMN `riskCritical` INT NOT NULL DEFAULT 401;

-- Move organizations that still have the previous system defaults to the new reference defaults.
UPDATE `Organization`
SET `riskMedium` = 101, `riskHigh` = 201, `riskCritical` = 401
WHERE `riskMedium` = 50 AND `riskHigh` = 100 AND `riskCritical` = 200;

-- Reclassify existing rows using each organization's configured upper bands while
-- retaining the fixed reference boundary between VERY_LOW and LOW.
UPDATE `FmeaItem` AS item
INNER JOIN `FmeaAssessment` AS assessment ON assessment.`id` = item.`assessmentId`
INNER JOIN `Organization` AS organization ON organization.`id` = assessment.`organizationId`
SET item.`riskLevel` = CASE
  WHEN item.`rpn` >= organization.`riskCritical` THEN 'CRITICAL'
  WHEN item.`rpn` >= organization.`riskHigh` THEN 'HIGH'
  WHEN item.`rpn` >= organization.`riskMedium` THEN 'MEDIUM'
  WHEN item.`rpn` >= 51 THEN 'LOW'
  ELSE 'VERY_LOW'
END;
