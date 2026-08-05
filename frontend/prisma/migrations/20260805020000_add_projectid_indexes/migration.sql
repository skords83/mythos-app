-- Fix 2 (Such-Layer Quick Wins): projectId is the most-filtered field in
-- /api/search (route.ts) but Prisma only auto-indexes FK columns it needs
-- for its own relation lookups (familyId, authorId, etc.), not every
-- column that happens to get filtered on. Add explicit indexes on
-- projectId for every model the search route filters by it directly.
--
-- Single-column index only (not composite with authorId/visibility):
-- visibilityWhere() combines with an OR, not an AND, so a composite index
-- wouldn't be usable by the planner for that branch anyway — projectId
-- alone is the selective predicate, the OR is cheap to filter afterwards.

-- CreateIndex
CREATE INDEX "Chapter_projectId_idx" ON "Chapter"("projectId");

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE INDEX "Place_projectId_idx" ON "Place"("projectId");

-- CreateIndex
CREATE INDEX "Item_projectId_idx" ON "Item"("projectId");

-- CreateIndex
CREATE INDEX "Faction_projectId_idx" ON "Faction"("projectId");

-- CreateIndex
CREATE INDEX "TimelineEvent_projectId_idx" ON "TimelineEvent"("projectId");

-- CreateIndex
CREATE INDEX "LoreEntry_projectId_idx" ON "LoreEntry"("projectId");

-- CreateIndex
CREATE INDEX "Idea_projectId_idx" ON "Idea"("projectId");
