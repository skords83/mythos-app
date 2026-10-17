/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { writeMcpEntity } from './mcp-entity-write'
jest.mock('@/lib/prisma', () => ({ prisma: { oAuthAccessToken: { findUnique: jest.fn() }, $transaction: jest.fn() } }))
const model = { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() }
const relation = { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() }
const tx = { relation, project: { findFirst: jest.fn() }, character: model, place: model, loreEntry: model, item: model, faction: model }
const date = '2026-01-01T00:00:00.000Z'
beforeEach(() => {
  jest.resetAllMocks()
  process.env.MYTHOS_OAUTH_ISSUER = 'https://example.test'
  ;(prisma.oAuthAccessToken.findUnique as jest.Mock).mockResolvedValue({ userId: 'u', scope: 'mythos:read mythos:write', expiresAt: new Date(Date.now() + 60000), resource: 'https://example.test/api/integrations/mcp' })
  ;(prisma.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  tx.project.findFirst.mockResolvedValue({ user: { familyId: 'f' } })
  model.create.mockResolvedValue({ id: 'new', updatedAt: new Date(date) })
  model.findFirst.mockResolvedValue({ updatedAt: new Date(date) })
  model.updateMany.mockResolvedValue({ count: 1 })
  relation.findMany.mockResolvedValue([])
})
test.each(['character', 'place', 'lore', 'item', 'faction'])('creates private authored %s entries', async entity => {
  const result = await writeMcpEntity('Bearer test', `mythos_create_${entity}`, { projectId: 'p', [entity === 'lore' ? 'title' : 'name']: 'Test' })
  expect(result.status).toBe(201)
  expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibility: 'PRIVATE', authorId: 'u', familyId: 'f', projectId: 'p' }) }))
})
test.each(['character', 'place', 'lore', 'item', 'faction'])('atomically updates a matching %s revision', async entity => {
  expect((await writeMcpEntity('Bearer test', `mythos_update_${entity}`, { projectId: 'p', id: 'e', expectedUpdatedAt: date, [entity === 'lore' ? 'content' : 'name']: 'Changed' })).status).toBe(200)
  expect(model.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: 'p', id: 'e', authorId: 'u', familyId: 'f', updatedAt: new Date(date) } }))
})
test('rejects a concurrent update', async () => {
  model.updateMany.mockResolvedValue({ count: 0 })
  expect((await writeMcpEntity('Bearer test', 'mythos_update_character', { projectId: 'p', id: 'e', expectedUpdatedAt: date, name: 'Changed' })).status).toBe(409)
})
test.each([{ name: '' }, { name: 123 }, { name: 'A', authorId: 'other' }, { name: 'A', visibility: 'FAMILY' }, { name: 'A', aliases: [null] }, { name: 'A', role: 'invalid' }])('rejects malformed or unauthorized fields %p', async data => {
  expect((await writeMcpEntity('Bearer test', 'mythos_create_character', { projectId: 'p', ...data })).status).toBe(400)
  expect(prisma.$transaction).not.toHaveBeenCalled()
})
test('denies read-only grants', async () => {
  ;(prisma.oAuthAccessToken.findUnique as jest.Mock).mockResolvedValue({ scope: 'mythos:read', expiresAt: new Date(Date.now() + 60000), resource: 'https://example.test/api/integrations/mcp' })
  expect((await writeMcpEntity('Bearer test', 'mythos_create_place', { projectId: 'p', name: 'A' })).status).toBe(403)
  expect(model.create).not.toHaveBeenCalled()
})
test('denies foreign projects and entries', async () => {
  tx.project.findFirst.mockResolvedValueOnce(null)
  expect((await writeMcpEntity('Bearer test', 'mythos_create_place', { projectId: 'p', name: 'A' })).status).toBe(404)
  model.findFirst.mockResolvedValueOnce(null)
  expect((await writeMcpEntity('Bearer test', 'mythos_update_place', { projectId: 'p', id: 'e', expectedUpdatedAt: date, name: 'A' })).status).toBe(404)
  expect(model.create).not.toHaveBeenCalled()
  expect(model.updateMany).not.toHaveBeenCalled()
})

test.each(['item', 'faction'])('%s supports partial updates and explicit clearing', async entity => {
  const result = await writeMcpEntity('Bearer test', `mythos_update_${entity}`, { projectId: 'p', id: 'e', expectedUpdatedAt: date, description: '' })
  expect(result.status).toBe(200)
  expect(model.updateMany.mock.calls[0][0].data).toEqual({ description: '', updatedAt: expect.any(Date) })
})
test.each(['item', 'faction'])('%s requires revision, rejects stale revisions and enforces author/project', async entity => {
  const args = { projectId: 'p', id: 'e', description: 'Text', expectedUpdatedAt: date }
  expect((await writeMcpEntity('Bearer test', `mythos_update_${entity}`, { ...args, expectedUpdatedAt: undefined })).status).toBe(400)
  model.updateMany.mockResolvedValueOnce({ count: 0 })
  expect((await writeMcpEntity('Bearer test', `mythos_update_${entity}`, args)).status).toBe(409)
  model.findFirst.mockResolvedValueOnce(null)
  expect((await writeMcpEntity('Bearer test', `mythos_update_${entity}`, args)).status).toBe(404)
  tx.project.findFirst.mockResolvedValueOnce(null)
  expect((await writeMcpEntity('Bearer test', `mythos_create_${entity}`, { projectId: 'p', name: 'Name' })).status).toBe(404)
})
test('item writes every content field and normalizes aliases; faction rejects aliases', async () => {
  const data = { name: 'Ring', description: 'Gold', origin: 'Berg', significance: 'Macht', aliases: [' Ring ', 'Ring'], visibility: 'FAMILY' }
  expect((await writeMcpEntity('Bearer test', 'mythos_create_item', { projectId: 'p', ...data })).status).toBe(201)
  expect(model.create.mock.calls[0][0].data).toMatchObject({ ...data, aliases: ['Ring'] })
  expect((await writeMcpEntity('Bearer test', 'mythos_create_faction', { projectId: 'p', name: 'Bund', aliases: [] })).status).toBe(400)
})
test.each(['item', 'faction'])('%s rejects invalid visibility and credentials', async entity => {
  const args = { projectId: 'p', name: 'Name' }
  expect((await writeMcpEntity('Bearer test', `mythos_create_${entity}`, { ...args, visibility: 'PUBLIC' })).status).toBe(400)
  expect((await writeMcpEntity(null, `mythos_create_${entity}`, args)).status).toBe(401)
  ;(prisma.oAuthAccessToken.findUnique as jest.Mock).mockResolvedValue({ scope: 'mythos:read', expiresAt: new Date(Date.now() + 60000), resource: 'https://example.test/api/integrations/mcp' })
  expect((await writeMcpEntity('Bearer test', `mythos_create_${entity}`, args)).status).toBe(403)
})

test('invalid links and conflicts never mutate entities or relations', async () => {
  const args = { projectId: 'p', id: 'e', expectedUpdatedAt: date, relations: [{ entityType: 'CHARACTER', entityId: 'c', direction: 'incoming', relationType: 'MEMBER_OF' }] }
  model.findFirst.mockResolvedValueOnce(null)
  expect((await writeMcpEntity('Bearer test', 'mythos_update_faction', args)).status).toBe(404)
  expect(model.updateMany).not.toHaveBeenCalled()
  model.findFirst.mockResolvedValueOnce({ id: 'c', authorId: 'u', familyId: 'f', visibility: 'PRIVATE' })
  model.updateMany.mockResolvedValueOnce({ count: 0 })
  expect((await writeMcpEntity('Bearer test', 'mythos_update_faction', args)).status).toBe(409)
  expect(relation.create).not.toHaveBeenCalled()
  expect(relation.deleteMany).not.toHaveBeenCalled()
})
test('relation-only updates advance the revision and save links after the conditional update', async () => {
  model.findFirst.mockResolvedValueOnce({ id: 'c', authorId: 'u', familyId: 'f', visibility: 'FAMILY' })
  expect((await writeMcpEntity('Bearer test', 'mythos_update_faction', { projectId: 'p', id: 'e', expectedUpdatedAt: date, relations: [{ entityType: 'CHARACTER', entityId: 'c', direction: 'incoming', relationType: 'MEMBER_OF' }] })).status).toBe(200)
  expect(model.updateMany.mock.calls[0][0].data).toEqual({ updatedAt: expect.any(Date) })
  expect(relation.create).toHaveBeenCalledTimes(1)
  expect(relation.create.mock.invocationCallOrder[0]).toBeGreaterThan(model.updateMany.mock.invocationCallOrder[0])
})
