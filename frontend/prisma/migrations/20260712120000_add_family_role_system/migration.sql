-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('OWNER', 'ADULT', 'CHILD');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'FAMILY');

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable columns first, existing rows get backfilled below
ALTER TABLE "User" ADD COLUMN "familyId" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "FamilyRole" NOT NULL DEFAULT 'ADULT';

ALTER TABLE "Character" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Character" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Character" ADD COLUMN "authorId" TEXT;
ALTER TABLE "Character" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "Place" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Place" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Place" ADD COLUMN "authorId" TEXT;
ALTER TABLE "Place" ALTER COLUMN "projectId" DROP NOT NULL;

-- Data backfill: one new Family per existing User, that user becomes its OWNER
DO $$
DECLARE
  u RECORD;
  new_family_id TEXT;
BEGIN
  FOR u IN SELECT id, COALESCE(name, email) AS label FROM "User" WHERE "familyId" IS NULL LOOP
    new_family_id := 'fam_' || substr(md5(random()::text || u.id), 1, 20);
    INSERT INTO "Family" (id, name, "createdAt", "updatedAt")
    VALUES (new_family_id, u.label || 's Familie', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    UPDATE "User" SET "familyId" = new_family_id, "role" = 'OWNER' WHERE id = u.id;
  END LOOP;
END $$;

-- Backfill Character/Place familyId + authorId from their project's owner
UPDATE "Character" c
SET "familyId" = u."familyId", "authorId" = p."userId"
FROM "Project" p
JOIN "User" u ON u.id = p."userId"
WHERE c."projectId" = p.id AND c."familyId" IS NULL;

UPDATE "Place" pl
SET "familyId" = u."familyId", "authorId" = p."userId"
FROM "Project" p
JOIN "User" u ON u.id = p."userId"
WHERE pl."projectId" = p.id AND pl."familyId" IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "User" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Character" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Character" ALTER COLUMN "authorId" SET NOT NULL;
ALTER TABLE "Place" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Place" ALTER COLUMN "authorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_familyId_idx" ON "User"("familyId");

-- CreateIndex
CREATE INDEX "Character_familyId_idx" ON "Character"("familyId");

-- CreateIndex
CREATE INDEX "Character_authorId_idx" ON "Character"("authorId");

-- CreateIndex
CREATE INDEX "Place_familyId_idx" ON "Place"("familyId");

-- CreateIndex
CREATE INDEX "Place_authorId_idx" ON "Place"("authorId");
