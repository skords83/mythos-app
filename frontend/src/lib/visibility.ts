import type { Visibility } from '@prisma/client'
import type { AuthContext } from './auth'

/**
 * Visibility-Propagation-Matrix (Z2)
 *
 * The app has (and will grow) two distinct relation shapes between
 * visibility-scoped entities (Character, Place, and future models). Each
 * propagates visibility differently — this is the shared policy both
 * existing code and future features (A1 Charakterbeziehungen, A3
 * Charakter-Ort-Verknüpfung, A6 Fraktionen, Z5 Relation-Infra) must follow.
 *
 * 1. Containment (hierarchical, e.g. Place.parent/children):
 *    A child's visibility can never be BROADER than its parent's.
 *      PRIVATE parent -> child MUST be PRIVATE.
 *      FAMILY parent  -> child MAY be PRIVATE or FAMILY.
 *    Enforced on create/update via `isChildVisibilityAllowed`, and
 *    maintained when a place is demoted FAMILY -> PRIVATE by cascading
 *    the demotion to its FAMILY descendants (`cascadePrivateToPlaceDescendants`).
 *    Rationale: a FAMILY child under a PRIVATE parent would leak the
 *    private parent's existence/name via the child's breadcrumb to family
 *    members who cannot see the parent itself.
 *
 * 2. Association (non-hierarchical — planned for Z5/A1/A3/A6: character
 *    relationships, character-place links, faction membership):
 *    The relation edge is only visible to a viewer if BOTH linked entities
 *    are individually visible to that viewer (AND rule). Do not store a
 *    separate `visibility` field on join/relation models — derive
 *    visibility live by checking both endpoints with `visibilityWhere`.
 *    A relation between a PRIVATE and a FAMILY entity may still exist; it
 *    is just only ever shown to viewers who can see the PRIVATE side too.
 */

/** Prisma OR-filter for "visible to this viewer": family-wide, or private but authored by them. */
export function visibilityWhere(context: Pick<AuthContext, 'userId'>) {
  return [{ visibility: 'FAMILY' as const }, { authorId: context.userId }]
}

export function isValidVisibility(value: unknown): value is Visibility {
  return value === 'PRIVATE' || value === 'FAMILY'
}

/** Containment rule: a child may not be more broadly visible than its parent. */
export function isChildVisibilityAllowed(parentVisibility: Visibility | undefined, childVisibility: Visibility): boolean {
  if (parentVisibility === 'PRIVATE' && childVisibility === 'FAMILY') return false
  return true
}

type PlaceVisibilityClient = {
  place: {
    findMany: (args: {
      where: { parentId: { in: string[] }; familyId: string; visibility: 'FAMILY' }
      select: { id: true }
    }) => Promise<{ id: string }[]>
    updateMany: (args: { where: { id: { in: string[] } }; data: { visibility: 'PRIVATE' } }) => Promise<unknown>
  }
}

/**
 * When a place is demoted from FAMILY to PRIVATE, its FAMILY descendants
 * would otherwise violate the containment rule — cascade the demotion
 * down the tree until no more FAMILY descendants remain.
 */
export async function cascadePrivateToPlaceDescendants(
  prisma: PlaceVisibilityClient,
  rootId: string,
  familyId: string
): Promise<void> {
  let frontier = [rootId]
  while (frontier.length > 0) {
    const children = await prisma.place.findMany({
      where: { parentId: { in: frontier }, familyId, visibility: 'FAMILY' },
      select: { id: true },
    })
    if (children.length === 0) break
    const ids = children.map((c) => c.id)
    await prisma.place.updateMany({ where: { id: { in: ids } }, data: { visibility: 'PRIVATE' } })
    frontier = ids
  }
}
