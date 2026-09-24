-- Persist the editable posture observations separately from the scoring inputs.
-- The JSON shape is validated at the API boundary so future image-model output can evolve safely.
ALTER TABLE `RulaAssessment`
  ADD COLUMN `postureAnalysis` JSON NULL;
