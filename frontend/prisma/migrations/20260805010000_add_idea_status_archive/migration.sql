-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('IDEE', 'IN_ARBEIT', 'UMGESETZT');

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN "status" "IdeaStatus" NOT NULL DEFAULT 'IDEE';
ALTER TABLE "Idea" ADD COLUMN "archivedAt" TIMESTAMP(3);
