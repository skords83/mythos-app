-- Free-text tag chips for a Scene (e.g. #transformation), independent of outline/description.
ALTER TABLE "Scene" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
