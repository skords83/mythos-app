CREATE TABLE "SourceEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" "RelatableEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "field" TEXT,
  "statement" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sceneId" TEXT REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "quote" TEXT NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT '',
  "suffix" TEXT NOT NULL DEFAULT '',
  "commentId" TEXT,
  "sourceHash" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "familyId" TEXT NOT NULL REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "SourceEvidence_familyId_entityType_entityId_idx" ON "SourceEvidence"("familyId", "entityType", "entityId");
CREATE INDEX "SourceEvidence_chapterId_idx" ON "SourceEvidence"("chapterId");
CREATE INDEX "SourceEvidence_sceneId_idx" ON "SourceEvidence"("sceneId");
