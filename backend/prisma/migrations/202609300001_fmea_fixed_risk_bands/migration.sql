-- Enforce the fixed FMEA reference bands for every existing organization and item:
-- VERY_LOW 1-50, LOW 51-100, MEDIUM 101-200, HIGH 201-400, CRITICAL 401+.
ALTER TABLE `Organization`
  MODIFY COLUMN `riskMedium` INT NOT NULL DEFAULT 101,
  MODIFY COLUMN `riskHigh` INT NOT NULL DEFAULT 201,
  MODIFY COLUMN `riskCritical` INT NOT NULL DEFAULT 401;

UPDATE `Organization`
SET `riskMedium` = 101, `riskHigh` = 201, `riskCritical` = 401;

UPDATE `FmeaItem`
SET `rpn` = `severity` * `occurrence` * `detection`,
    `riskLevel` = CASE
  WHEN (`severity` * `occurrence` * `detection`) >= 401 THEN 'CRITICAL'
  WHEN (`severity` * `occurrence` * `detection`) >= 201 THEN 'HIGH'
  WHEN (`severity` * `occurrence` * `detection`) >= 101 THEN 'MEDIUM'
  WHEN (`severity` * `occurrence` * `detection`) >= 51 THEN 'LOW'
  ELSE 'VERY_LOW'
END;
