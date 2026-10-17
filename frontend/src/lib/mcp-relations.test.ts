/** @jest-environment node */
import { parseMcpRelations, prepareMcpRelations, readMcpRelations } from './mcp-relations'
import type { Prisma } from '@prisma/client'
const character = { findFirst: jest.fn() }
const relation = { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn() }
const db = { character, relation } as unknown as Prisma.TransactionClient
const scope = { authorId: 'u', familyId: 'f' }
const link = { entityType: 'CHARACTER' as const, entityId: 'c', direction: 'incoming' as const, relationType: 'LEADER_OF' }
const row = { id: 'r', sourceType: 'CHARACTER', sourceId: 'c', targetType: 'FACTION', targetId: 'g', relationType: 'LEADER_OF', ...scope }
beforeEach(() => {
  jest.resetAllMocks()
  character.findFirst.mockResolvedValue({ id: 'c', ...scope, visibility: 'PRIVATE' })
  relation.findMany.mockResolvedValue([])
})
test.each([null, {}, [null], [{ ...link, entityType: 'INVALID' }], [{ ...link, relationType: 'BEFORE' }], [link, link]])('rejects malformed or reserved links %p', value => {
  expect(parseMcpRelations(value)).toBeNull()
})
test.each([null, { id: 'c', familyId: 'f', authorId: 'other', visibility: 'PRIVATE' }])('rejects inaccessible endpoints %p before mutation', async endpoint => {
  character.findFirst.mockResolvedValue(endpoint)
  expect(await prepareMcpRelations(db, 'FACTION', 'g', [link], scope)).toMatchObject({ status: 404 })
  expect(character.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c', familyId: 'f' } }))
  expect(relation.create).not.toHaveBeenCalled()
  expect(relation.deleteMany).not.toHaveBeenCalled()
})
test('rejects self links', async () => {
  expect(await prepareMcpRelations(db, 'FACTION', 'g', [{ ...link, entityType: 'FACTION', entityId: 'g' }], scope)).toMatchObject({ status: 400 })
})
test('stores faction membership using the existing relation orientation and fields', async () => {
  const prepared = await prepareMcpRelations(db, 'FACTION', undefined, [link], scope)
  if ('error' in prepared) throw new Error(prepared.error)
  await prepared.save('g')
  expect(relation.create).toHaveBeenCalledWith({ data: { ...scope, sourceType: 'CHARACTER', sourceId: 'c', targetType: 'FACTION', targetId: 'g', relationType: 'LEADER_OF', label: null } })
})
test('reads links only when both endpoints are visible', async () => {
  relation.findMany.mockResolvedValue([row])
  const anchor = { id: 'g', ...scope, visibility: 'PRIVATE' as const }
  expect(await readMcpRelations(db, 'FACTION', anchor, 'u')).toEqual([{ ...row, ...link }])
  character.findFirst.mockResolvedValue({ id: 'c', ...scope, authorId: 'other', visibility: 'PRIVATE' })
  expect(await readMcpRelations(db, 'FACTION', anchor, 'u')).toEqual([])
})
test('clearing preserves other authors and hidden links', async () => {
  relation.findMany.mockResolvedValue([row, { ...row, id: 'foreign', authorId: 'other' }, { ...row, id: 'hidden', sourceId: 'hidden' }])
  character.findFirst.mockImplementation(async ({ where }) => where.id === 'hidden' ? null : { id: 'c', ...scope, visibility: 'PRIVATE' })
  const prepared = await prepareMcpRelations(db, 'FACTION', 'g', [], scope)
  if ('error' in prepared) throw new Error(prepared.error)
  await prepared.save('g')
  expect(relation.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['r'] }, ...scope } })
  expect(relation.create).not.toHaveBeenCalled()
})
