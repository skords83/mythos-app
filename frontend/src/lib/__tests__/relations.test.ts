import {
  deleteRelationsForEntity,
  isEntityVisibleToViewer,
  isRelationVisible,
  isSameEntity,
  isValidEntityType,
  resolveEntity,
} from '../relations'

describe('isValidEntityType', () => {
  it('accepts CHARACTER and PLACE', () => {
    expect(isValidEntityType('CHARACTER')).toBe(true)
    expect(isValidEntityType('PLACE')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidEntityType('FACTION')).toBe(false)
    expect(isValidEntityType('')).toBe(false)
    expect(isValidEntityType(undefined)).toBe(false)
  })
})

describe('isSameEntity', () => {
  it('is true only when type and id both match', () => {
    expect(isSameEntity('CHARACTER', 'c1', 'CHARACTER', 'c1')).toBe(true)
    expect(isSameEntity('CHARACTER', 'c1', 'CHARACTER', 'c2')).toBe(false)
    expect(isSameEntity('CHARACTER', 'c1', 'PLACE', 'c1')).toBe(false)
  })
})

describe('isEntityVisibleToViewer', () => {
  const viewer = { userId: 'user-1' }

  it('is visible when FAMILY regardless of author', () => {
    expect(isEntityVisibleToViewer(viewer, { visibility: 'FAMILY', authorId: 'someone-else' })).toBe(true)
  })

  it('is visible when PRIVATE and authored by the viewer', () => {
    expect(isEntityVisibleToViewer(viewer, { visibility: 'PRIVATE', authorId: 'user-1' })).toBe(true)
  })

  it('is not visible when PRIVATE and authored by someone else', () => {
    expect(isEntityVisibleToViewer(viewer, { visibility: 'PRIVATE', authorId: 'someone-else' })).toBe(false)
  })
})

describe('isRelationVisible (Z2 Association rule)', () => {
  const viewer = { userId: 'user-1' }
  const familyEntity = { visibility: 'FAMILY' as const, authorId: 'someone-else' }
  const ownPrivateEntity = { visibility: 'PRIVATE' as const, authorId: 'user-1' }
  const otherPrivateEntity = { visibility: 'PRIVATE' as const, authorId: 'someone-else' }

  it('is visible when both endpoints are visible', () => {
    expect(isRelationVisible(viewer, familyEntity, ownPrivateEntity)).toBe(true)
  })

  it('is hidden when either endpoint is not visible', () => {
    expect(isRelationVisible(viewer, familyEntity, otherPrivateEntity)).toBe(false)
    expect(isRelationVisible(viewer, otherPrivateEntity, familyEntity)).toBe(false)
  })
})

describe('resolveEntity', () => {
  it('queries the character table for CHARACTER and scopes by familyId', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'c1', familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY' })
    const prisma = { character: { findFirst }, place: { findFirst: jest.fn() } }

    const result = await resolveEntity(prisma, 'CHARACTER', 'c1', 'fam-1')

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', familyId: 'fam-1' } })
    )
    expect(result).toEqual({ id: 'c1', familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY' })
  })

  it('queries the place table for PLACE', async () => {
    const findFirst = jest.fn().mockResolvedValue(null)
    const prisma = { character: { findFirst: jest.fn() }, place: { findFirst } }

    const result = await resolveEntity(prisma, 'PLACE', 'p1', 'fam-1')

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', familyId: 'fam-1' } })
    )
    expect(result).toBeNull()
  })
})

describe('deleteRelationsForEntity', () => {
  it('deletes relations where the entity is source or target', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 3 })
    const prisma = { relation: { deleteMany } }

    await deleteRelationsForEntity(prisma, 'CHARACTER', 'c1')

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { sourceType: 'CHARACTER', sourceId: 'c1' },
          { targetType: 'CHARACTER', targetId: 'c1' },
        ],
      },
    })
  })
})
