-- Record the one-time automatic insertion of the five default FMEA detail rows.
ALTER TABLE `FmeaAssessment`
  ADD COLUMN `fmeaDetailSeededAt` DATETIME(3) NULL;

-- Assessments seeded by the previous empty-table implementation must not receive
-- a second automatic batch after this idempotency marker is introduced.
UPDATE `FmeaAssessment` AS `f`
SET `fmeaDetailSeededAt` = CURRENT_TIMESTAMP(3)
WHERE EXISTS (
  SELECT 1
  FROM `AuditLog` AS `a`
  WHERE `a`.`action` = 'FMEA_REPORT_DETAIL_AUTOCREATE'
    AND `a`.`entityType` = 'FmeaAssessment'
    AND `a`.`entityId` = `f`.`id`
);
