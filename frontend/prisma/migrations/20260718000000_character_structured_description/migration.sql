-- AlterTable: split Character.description into structured fields
-- existing free-text description becomes the "backstory" tab; appearance/personality start empty
ALTER TABLE "Character" RENAME COLUMN "description" TO "backstory";
ALTER TABLE "Character" ADD COLUMN "appearance" TEXT;
ALTER TABLE "Character" ADD COLUMN "personality" TEXT;
