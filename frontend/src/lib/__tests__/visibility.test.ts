import {
  cascadePrivateToPlaceDescendants,
  isChildVisibilityAllowed,
  isValidVisibility,
  visibilityWhere,
} from '../visibility'

describe('visibilityWhere', () => {
  it('builds the family-or-own-private OR filter', () => {
    expect(visibilityWhere({ userId: 'user-1' })).toEqual([{ visibility: 'FAMILY' }, { authorId: 'user-1' }])
  })
})

describe('isValidVisibility', () => {
  it.each(['PRIVATE', 'FAMILY'])('accepts %s', (value) => {
    expect(isValidVisibility(value)).toBe(true)
  })

  it.each([undefined, null, '', 'PUBLIC'])('rejects %p', (value) => {
    expect(isValidVisibility(value)).toBe(false)
  })
})

describe('isChildVisibilityAllowed', () => {
  it('rejects a FAMILY child under a PRIVATE parent', () => {
    expect(isChildVisibilityAllowed('PRIVATE', 'FAMILY')).toBe(false)
  })

  it('allows a PRIVATE child under a PRIVATE parent', () => {
    expect(isChildVisibilityAllowed('PRIVATE', 'PRIVATE')).toBe(true)
  })

  it('allows any child under a FAMILY parent', () => {
    expect(isChildVisibilityAllowed('FAMILY', 'PRIVATE')).toBe(true)
    expect(isChildVisibilityAllowed('FAMILY', 'FAMILY')).toBe(true)
  })

  it('allows any child when the parent visibility is unknown (no parent)', () => {
    expect(isChildVisibilityAllowed(undefined, 'FAMILY')).toBe(true)
  })
})

describe('cascadePrivateToPlaceDescendants', () => {
  it('walks the tree level by level, demoting only FAMILY descendants', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'child-1' }, { id: 'child-2' }])
      .mockResolvedValueOnce([{ id: 'grandchild-1' }])
      .mockResolvedValueOnce([])
    const updateMany = jest.fn().mockResolvedValue(undefined)
    const prisma = { place: { findMany, updateMany } }

    await cascadePrivateToPlaceDescendants(prisma, 'root', 'fam-1')

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { parentId: { in: ['root'] }, familyId: 'fam-1', visibility: 'FAMILY' },
      select: { id: true },
    })
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { parentId: { in: ['child-1', 'child-2'] }, familyId: 'fam-1', visibility: 'FAMILY' },
      select: { id: true },
    })
    expect(findMany).toHaveBeenNthCalledWith(3, {
      where: { parentId: { in: ['grandchild-1'] }, familyId: 'fam-1', visibility: 'FAMILY' },
      select: { id: true },
    })
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: { in: ['child-1', 'child-2'] } },
      data: { visibility: 'PRIVATE' },
    })
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ['grandchild-1'] } },
      data: { visibility: 'PRIVATE' },
    })
  })

  it('stops immediately when there are no FAMILY children', async () => {
    const findMany = jest.fn().mockResolvedValueOnce([])
    const updateMany = jest.fn()
    const prisma = { place: { findMany, updateMany } }

    await cascadePrivateToPlaceDescendants(prisma, 'root', 'fam-1')

    expect(findMany).toHaveBeenCalledTimes(1)
    expect(updateMany).not.toHaveBeenCalled()
  })
})
