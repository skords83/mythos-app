CREATE TABLE "Upload" (
  "filename" TEXT NOT NULL,
  "ownerIds" TEXT[] NOT NULL,
  CONSTRAINT "Upload_pkey" PRIMARY KEY ("filename")
);

-- Freeze ownership from existing references before the authenticated route goes
-- live. Multiple historical owners retain access; later copied URLs cannot
-- create new ownership. JSON casts cover both supported chapter content shapes.
WITH sources AS (
  SELECT "coverImage" AS value, "userId" AS owner FROM "Project"
  UNION ALL
  SELECT c.content::text, p."userId" FROM "Chapter" c
    JOIN "Project" p ON p.id = c."projectId"
  UNION ALL
  SELECT "avatarUrl", "authorId" FROM "Character"
  UNION ALL
  SELECT url, "authorId" FROM "PlaceImage"
  UNION ALL
  SELECT content::text, "authorId" FROM "ChapterVersion"
), refs AS (
  SELECT matches[1] AS filename, owner
  FROM sources,
    LATERAL regexp_matches(value, '/(?:api/upload|uploads)/([0-9a-fA-F-]{36}\.(?:png|jpg|jpeg|gif|webp))', 'g') AS matches
)
INSERT INTO "Upload" (filename, "ownerIds")
SELECT filename, array_agg(DISTINCT owner) FROM refs GROUP BY filename;
