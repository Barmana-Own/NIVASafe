-- Link corrective actions to a specific FMEA failure mode without deleting actions when a risk row is removed.
ALTER TABLE `CorrectiveAction`
  ADD COLUMN `fmeaItemId` VARCHAR(36) NULL,
  ADD KEY `CorrectiveAction_fmeaItemId_idx` (`fmeaItemId`),
  ADD CONSTRAINT `CorrectiveAction_fmeaItemId_fkey` FOREIGN KEY (`fmeaItemId`) REFERENCES `FmeaItem` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
