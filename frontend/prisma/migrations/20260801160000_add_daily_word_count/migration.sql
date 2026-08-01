-- C11: historical daily word-count log for the project activity heatmap/streaks
CREATE TABLE "DailyWordCount" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyWordCount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyWordCount_projectId_date_key" ON "DailyWordCount"("projectId", "date");

ALTER TABLE "DailyWordCount" ADD CONSTRAINT "DailyWordCount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
