import { checkUniverseEdge } from './universe-relations'
import type { Prisma, RelatableEntityType } from '@prisma/client'
import { isValidEntityType, resolveEntity, isEntityVisibleToViewer, type ResolvedEntity } from './relations'

const identifier = { type: 'string', minLength: 1, maxLength: 128 }
export const relationInputSchema = {
  type: 'array', maxItems: 100,
  description: 'Replace your visible relations only. Omit to preserve; [] clears them. Other authors and hidden links are preserved. Incoming CHARACTER links represent faction members.',
  items: {
    type: 'object', additionalProperties: false,
    properties: {
      entityType: { enum: ['CHARACTER', 'PLACE', 'ITEM', 'FACTION', 'SCENE', 'EVENT', 'LORE_ENTRY'] },
      entityId: identifier,
      direction: { enum: ['incoming', 'outgoing'] },
      relationType: { type: 'string', minLength: 1, maxLength: 300 },
      label: { type: ['string', 'null'], maxLength: 20000 },
    },
    required: ['entityType', 'entityId', 'direction', 'relationType'],
  },
}
type Link = { entityType: RelatableEntityType; entityId: string; direction: 'incoming' | 'outgoing'; relationType: string; label?: string | null }
export function parseMcpRelations(value: unknown): Link[] | undefined | null {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > 100) return null
  const seen = new Set<string>()
  for (const link of value) {
    if (!link || typeof link !== 'object' || Array.isArray(link) ||
      Object.keys(link).some(key => !['entityType', 'entityId', 'direction', 'relationType', 'label'].includes(key)) ||
      !isValidEntityType(link.entityType) || typeof link.entityId !== 'string' || !link.entityId.trim() || link.entityId.length > 128 ||
      !['incoming', 'outgoing'].includes(link.direction) || typeof link.relationType !== 'string' || !link.relationType.trim() || link.relationType.length > 300 ||
      (link.label !== undefined && link.label !== null && (typeof link.label !== 'string' || link.label.length > 20000))) return null
    // These reserved timeline associations cannot have an ITEM/FACTION endpoint.
    if (['BEFORE', 'TAKES_PLACE_AT', 'REFERENCES_PAST'].includes(link.relationType)) return null
    const key = JSON.stringify([link.entityType, link.entityId, link.direction, link.relationType])
    if (seen.has(key)) return null
    seen.add(key)
  }
  return value as Link[]
}

export async function readMcpRelations(db: Prisma.TransactionClient, type: RelatableEntityType, anchor: ResolvedEntity, userId: string) {
  const rows = await db.relation.findMany({ where: { familyId: anchor.familyId, OR: [
    { sourceType: type, sourceId: anchor.id }, { targetType: type, targetId: anchor.id },
  ] }, orderBy: { createdAt: 'asc' } })
  const visible = []
  for (const row of rows) {
    const outgoing = row.sourceType === type && row.sourceId === anchor.id
    const entityType = outgoing ? row.targetType : row.sourceType
    const entityId = outgoing ? row.targetId : row.sourceId
    const counterpart = await resolveEntity(db, entityType, entityId, anchor.familyId)
    if (counterpart && isEntityVisibleToViewer({ userId }, anchor) && isEntityVisibleToViewer({ userId }, counterpart)) {
      visible.push({ ...row, entityType, entityId, direction: outgoing ? 'outgoing' as const : 'incoming' as const })
    }
  }
  return visible
}

export async function prepareMcpRelations(db: Prisma.TransactionClient, type: 'ITEM' | 'FACTION', id: string | undefined, links: Link[], scope: { authorId: string; familyId: string }): Promise<{ status: number; error: string } | { save: (id: string) => Promise<void> }> {
  for (const link of links) {
    if (link.entityType === type && link.entityId === id) return { status: 400, error: 'An entry cannot link to itself' }
    const endpoint = await resolveEntity(db, link.entityType, link.entityId, scope.familyId)
    if (!endpoint || !isEntityVisibleToViewer({ userId: scope.authorId }, endpoint)) return { status: 404, error: 'Linked entry not found or inaccessible' }
  }
  // Only replace links that the caller can see and authored; never delete hidden or foreign links.
  const existing = id ? await readMcpRelations(db, type, { id, ...scope, visibility: 'PRIVATE' }, scope.authorId) : []
  const owned = existing.filter(row => row.authorId === scope.authorId)
  return { save: async (anchorId: string) => {
    await db.relation.deleteMany({ where: { id: { in: owned.map(row => row.id) }, authorId: scope.authorId, familyId: scope.familyId } })
    for (const link of links) {
      const endpoints = link.direction === 'outgoing'
        ? { sourceType: type, sourceId: anchorId, targetType: link.entityType, targetId: link.entityId }
        : { sourceType: link.entityType, sourceId: link.entityId, targetType: type, targetId: anchorId }
      await checkUniverseEdge(db, { userId: scope.authorId, familyId: scope.familyId, role: 'ADULT' }, endpoints)
      await db.relation.create({ data: { ...endpoints, familyId: scope.familyId, authorId: scope.authorId, relationType: link.relationType, label: link.label || null } })
    }
  } }
}
