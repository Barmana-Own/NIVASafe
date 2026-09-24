-- Persist structured RULA activity context separately from the scoring inputs.
-- The JSON shape is validated at the API boundary so units can evolve without a breaking table change.
ALTER TABLE `RulaAssessment`
  ADD COLUMN `activityInfo` JSON NULL;
