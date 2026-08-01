-- C9: named, switchable alternate drafts of a chapter's prose
CREATE TABLE "ChapterVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "chapterId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterVersion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChapterVersion" ADD CONSTRAINT "ChapterVersion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterVersion" ADD CONSTRAINT "ChapterVersion_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterVersion" ADD CONSTRAINT "ChapterVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
