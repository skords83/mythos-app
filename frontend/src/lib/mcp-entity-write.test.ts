/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { writeMcpEntity } from './mcp-entity-write'
jest.mock('@/lib/prisma', () => ({ prisma: { oAuthAccessToken: { findUnique: jest.fn() }, $transaction: jest.fn() } }))
const model = { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() }
const tx = { project: { findFirst: jest.fn() }, character: model, place: model, loreEntry: model }
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
})
test.each(['character', 'place', 'lore'])('creates private authored %s entries', async entity => {
  const result = await writeMcpEntity('Bearer test', `mythos_create_${entity}`, { projectId: 'p', [entity === 'lore' ? 'title' : 'name']: 'Test' })
  expect(result.status).toBe(201)
  expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibility: 'PRIVATE', authorId: 'u', familyId: 'f', projectId: 'p' }) }))
})
test.each(['character', 'place', 'lore'])('atomically updates a matching %s revision', async entity => {
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
