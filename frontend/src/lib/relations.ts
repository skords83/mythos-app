import type { RelatableEntityType, Visibility } from '@prisma/client'
import type { AuthContext } from './auth'

/**
 * Generic relation/join infrastructure (Z5).
 *
 * A single polymorphic `Relation` row type (see schema.prisma) is shared by
 * every future association feature (A1 character relationships, A3
 * character-place links, A6 faction membership) instead of a bespoke join
 * table per feature. This module holds the cross-cutting pieces every
 * consumer needs: resolving either endpoint regardless of its concrete
 * model, and the Z2 Association visibility rule (see lib/visibility.ts) —
 * an edge is visible only if BOTH endpoints are visible to the viewer.
 */

const ENTITY_MODEL = {
  CHARACTER: 'character',
  PLACE: 'place',
  ITEM: 'item',
  FACTION: 'faction',
  SCENE: 'scene',
  EVENT: 'timelineEvent',
} as const satisfies Record<RelatableEntityType, 'character' | 'place' | 'item' | 'faction' | 'scene' | 'timelineEvent'>

export function isValidEntityType(value: unknown): value is RelatableEntityType {
  return (
    value === 'CHARACTER' ||
    value === 'PLACE' ||
    value === 'ITEM' ||
    value === 'FACTION' ||
    value === 'SCENE' ||
    value === 'EVENT'
  )
}

export function isSameEntity(
  aType: RelatableEntityType,
  aId: string,
  bType: RelatableEntityType,
  bId: string
): boolean {
  return aType === bType && aId === bId
}

export type ResolvedEntity = {
  id: string
  familyId: string
  authorId: string
  visibility: Visibility
}

type RelationEntityClient = {
  character: { findFirst: (args: any) => Promise<ResolvedEntity | null> }
  place: { findFirst: (args: any) => Promise<ResolvedEntity | null> }
  item: { findFirst: (args: any) => Promise<ResolvedEntity | null> }
  faction: { findFirst: (args: any) => Promise<ResolvedEntity | null> }
  scene: { findFirst: (args: any) => Promise<ResolvedEntity | null> }
  timelineEvent: { findFirst: (args: any) => Promise<ResolvedEntity | null> }
}

/** Look up either endpoint of a Relation by its polymorphic (type, id) pair, scoped to a family. */
export async function resolveEntity(
  prisma: RelationEntityClient,
  type: RelatableEntityType,
  id: string,
  familyId: string
): Promise<ResolvedEntity | null> {
  const model = ENTITY_MODEL[type]
  return prisma[model].findFirst({
    where: { id, familyId },
    select: { id: true, familyId: true, authorId: true, visibility: true },
  })
}

/** Same "visible to this viewer" rule as `visibilityWhere`, applied to an already-fetched row. */
export function isEntityVisibleToViewer(
  context: Pick<AuthContext, 'userId'>,
  entity: Pick<ResolvedEntity, 'visibility' | 'authorId'>
): boolean {
  return entity.visibility === 'FAMILY' || entity.authorId === context.userId
}

/** Association rule (Z2): an edge is visible only if BOTH endpoints are visible to the viewer. */
export function isRelationVisible(
  context: Pick<AuthContext, 'userId'>,
  source: Pick<ResolvedEntity, 'visibility' | 'authorId'>,
  target: Pick<ResolvedEntity, 'visibility' | 'authorId'>
): boolean {
  return isEntityVisibleToViewer(context, source) && isEntityVisibleToViewer(context, target)
}

type RelationDeleteClient = {
  relation: { deleteMany: (args: { where: any }) => Promise<unknown> }
}

/**
 * Relation rows aren't covered by a Prisma FK cascade — a polymorphic
 * (type, id) pair can't be declared as a foreign key. Callers deleting a
 * Character or Place must explicitly clean up any Relation rows that
 * reference it on either side.
 */
export async function deleteRelationsForEntity(
  prisma: RelationDeleteClient,
  type: RelatableEntityType,
  id: string
): Promise<void> {
  await prisma.relation.deleteMany({
    where: {
      OR: [
        { sourceType: type, sourceId: id },
        { targetType: type, targetId: id },
      ],
    },
  })
}
