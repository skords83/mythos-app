ALTER TABLE "Character" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Place" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Item" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Project" ADD COLUMN "totalWordGoal" INTEGER;
CREATE TABLE "WritingSession" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE, "date" TEXT NOT NULL, "activeSeconds" INTEGER NOT NULL DEFAULT 0, "words" INTEGER NOT NULL DEFAULT 0, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "WritingSession_projectId_date_idx" ON "WritingSession"("projectId", "date");
CREATE TABLE "GrowthSnapshot" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE, "date" TEXT NOT NULL, "wordCount" INTEGER NOT NULL, "chapters" JSONB NOT NULL);
CREATE UNIQUE INDEX "GrowthSnapshot_projectId_date_key" ON "GrowthSnapshot"("projectId", "date");

ALTER TABLE "TimelineEvent" ADD COLUMN "duration" TEXT;

ALTER TABLE "TimelineEvent" ADD COLUMN "chapterId" TEXT REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
