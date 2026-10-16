-- Chapter proposals are drafts awaiting approval by an authenticated Mythos user.
CREATE TYPE "ChapterProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED', 'EXPIRED');

CREATE TABLE "ChapterProposal" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "expectedUpdatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ChapterProposalStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    CONSTRAINT "ChapterProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChapterProposal_authorId_status_createdAt_idx" ON "ChapterProposal"("authorId", "status", "createdAt");
CREATE INDEX "ChapterProposal_chapterId_status_idx" ON "ChapterProposal"("chapterId", "status");
CREATE INDEX "ChapterProposal_expiresAt_idx" ON "ChapterProposal"("expiresAt");

ALTER TABLE "ChapterProposal" ADD CONSTRAINT "ChapterProposal_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterProposal" ADD CONSTRAINT "ChapterProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterProposal" ADD CONSTRAINT "ChapterProposal_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
