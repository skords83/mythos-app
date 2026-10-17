/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { authenticateMcp } from './mcp-auth'
jest.mock('@/lib/prisma', () => ({ prisma: { oAuthAccessToken: { findUnique: jest.fn() } } }))
const lookup = prisma.oAuthAccessToken.findUnique as jest.Mock
const resource = 'https://mythos.example/api/integrations/mcp'
const request = new Request(resource, { headers: { authorization: 'Bearer test' } })
const valid = { scope: 'mythos:read mythos:write', resource, expiresAt: new Date('2099-01-01'), revokedAt: null }
beforeEach(() => {
  process.env.MYTHOS_OAUTH_ISSUER = 'https://mythos.example'
  lookup.mockReset().mockResolvedValue(valid)
})
test('accepts the write grant for both reading and writing', async () => {
  expect(await authenticateMcp(request)).toBeNull()
  expect(await authenticateMcp(request, 'mythos:write')).toBeNull()
})
test('keeps existing read grants read-only and challenges with the missing scope', async () => {
  lookup.mockResolvedValue({ ...valid, scope: 'mythos:read' })
  expect(await authenticateMcp(request)).toBeNull()
  const denied = await authenticateMcp(request, 'mythos:write')
  expect(denied?.status).toBe(403)
  expect(denied?.headers.get('www-authenticate')).toContain('scope="mythos:write"')
})
test.each([
  [{ resource: 'https://other.example/mcp' }, 401],
  [{ revokedAt: new Date() }, 401],
  [{ expiresAt: new Date(0) }, 401],
  [{ scope: 'mythos:write' }, 403],
  [{ scope: 'mythos:read mythos:delete' }, 403],
])('rejects invalid write grants %p', async (change, status) => {
  lookup.mockResolvedValue({ ...valid, ...change })
  expect((await authenticateMcp(request, 'mythos:write'))?.status).toBe(status)
})
