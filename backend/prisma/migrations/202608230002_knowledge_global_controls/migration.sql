ALTER TABLE `KnowledgeDocument`
  ADD COLUMN `aiOnly` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `isGlobal` BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX `KnowledgeDocument_isGlobal_published_deletedAt_idx`
  ON `KnowledgeDocument`(`isGlobal`, `published`, `deletedAt`);
