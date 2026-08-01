-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('PROTAGONIST', 'ANTAGONIST', 'MENTOR');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN "role" "CharacterRole";
