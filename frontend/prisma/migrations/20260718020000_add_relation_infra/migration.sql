-- CreateEnum
CREATE TYPE "RelatableEntityType" AS ENUM ('CHARACTER', 'PLACE');

-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "sourceType" "RelatableEntityType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" "RelatableEntityType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Relation_familyId_sourceType_sourceId_idx" ON "Relation"("familyId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Relation_familyId_targetType_targetId_idx" ON "Relation"("familyId", "targetType", "targetId");
