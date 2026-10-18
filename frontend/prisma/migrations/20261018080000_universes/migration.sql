-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "universeId" TEXT,
ADD COLUMN     "universeOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "universeId" TEXT;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "universeId" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "universeId" TEXT;

-- AlterTable
ALTER TABLE "Faction" ADD COLUMN     "universeId" TEXT;

-- AlterTable
ALTER TABLE "LoreEntry" ADD COLUMN     "universeId" TEXT;

-- CreateTable
CREATE TABLE "Universe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "familyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Universe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityUsage" (
    "id" TEXT NOT NULL,
    "entityType" "RelatableEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContinuityAssertion" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "entityType" "RelatableEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "property" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "perspective" TEXT NOT NULL DEFAULT 'WORLD',
    "observerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "startsAt" JSONB NOT NULL,
    "endsAt" JSONB,
    "revealedAt" JSONB,
    "relationId" TEXT,
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContinuityAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityUsage_projectId_idx" ON "EntityUsage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityUsage_entityType_entityId_projectId_key" ON "EntityUsage"("entityType", "entityId", "projectId");

-- CreateIndex
CREATE INDEX "ContinuityAssertion_universeId_entityType_entityId_idx" ON "ContinuityAssertion"("universeId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoreEntry" ADD CONSTRAINT "LoreEntry_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Universe" ADD CONSTRAINT "Universe_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Universe" ADD CONSTRAINT "Universe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityUsage" ADD CONSTRAINT "EntityUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityAssertion" ADD CONSTRAINT "ContinuityAssertion_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- An identity cannot be both local and shared. No backfill of user content.
ALTER TABLE "Character" ADD CONSTRAINT "Character_scope" CHECK ("universeId" IS NULL OR "projectId" IS NULL);
ALTER TABLE "Place" ADD CONSTRAINT "Place_scope" CHECK ("universeId" IS NULL OR "projectId" IS NULL);
ALTER TABLE "Item" ADD CONSTRAINT "Item_scope" CHECK ("universeId" IS NULL OR "projectId" IS NULL);
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_scope" CHECK ("universeId" IS NULL OR "projectId" IS NULL);
ALTER TABLE "LoreEntry" ADD CONSTRAINT "LoreEntry_scope" CHECK ("universeId" IS NULL OR "projectId" IS NULL);

-- Legacy deletion endpoints cannot orphan polymorphic continuity references.
CREATE FUNCTION protect_continuity_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "ContinuityAssertion" a WHERE
   a."entityId" = OLD.id OR a."observerId" = OLD.id OR a."relationId" = OLD.id OR OLD.id = ANY(a."evidenceIds") OR
   a."startsAt"->>'projectId' = OLD.id OR a."startsAt"->>'chapterId' = OLD.id OR a."startsAt"->>'sceneId' = OLD.id OR a."startsAt"->>'eventId' = OLD.id OR
   a."endsAt"->>'projectId' = OLD.id OR a."endsAt"->>'chapterId' = OLD.id OR a."endsAt"->>'sceneId' = OLD.id OR a."endsAt"->>'eventId' = OLD.id OR
   a."revealedAt"->>'projectId' = OLD.id OR a."revealedAt"->>'chapterId' = OLD.id OR a."revealedAt"->>'sceneId' = OLD.id OR a."revealedAt"->>'eventId' = OLD.id)
 THEN RAISE EXCEPTION 'Eintrag wird von zeitlichen Aussagen verwendet; zuerst Referenzen lösen.' USING ERRCODE = '23503'; END IF;
 IF EXISTS (SELECT 1 FROM "EntityUsage" WHERE "entityId"=OLD.id)
 THEN RAISE EXCEPTION 'Gemeinsamer Eintrag wird in Büchern verwendet.' USING ERRCODE = '23503'; END IF;
 RETURN OLD;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['Character','Place','Item','Faction','LoreEntry','Project','Chapter','Scene','TimelineEvent','Relation','SourceEvidence'] LOOP
  EXECUTE format('CREATE TRIGGER protect_continuity_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_continuity_reference()',t);
 END LOOP;
END $$;
