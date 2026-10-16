/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { hashCredential } from './oauth-credentials'
import { resolveReadOnlyUser } from './integration-auth'

jest.mock('@/lib/prisma', () => ({ prisma: { oAuthAccessToken: { findUnique: jest.fn() } } }))
const db = prisma.oAuthAccessToken.findUnique as jest.Mock
const token = 'oauth-test-credential'
const originalStatic = process.env.MYTHOS_INTEGRATION_READ_TOKEN
const originalUser = process.env.MYTHOS_INTEGRATION_USER_ID
beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.MYTHOS_INTEGRATION_READ_TOKEN
  delete process.env.MYTHOS_INTEGRATION_USER_ID
  db.mockResolvedValue({
    userId: 'oauth-user', scope: 'mythos:read',
    expiresAt: new Date(Date.now() + 60000), revokedAt: null,
  })
})
afterAll(() => {
  if (originalStatic === undefined) delete process.env.MYTHOS_INTEGRATION_READ_TOKEN
  else process.env.MYTHOS_INTEGRATION_READ_TOKEN = originalStatic
  if (originalUser === undefined) delete process.env.MYTHOS_INTEGRATION_USER_ID
  else process.env.MYTHOS_INTEGRATION_USER_ID = originalUser
})
test('resolves a valid OAuth bearer to its actual user', async () => {
  expect(await resolveReadOnlyUser('Bearer ' + token)).toBe('oauth-user')
  expect(db).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: hashCredential(token) } }))
})
test('rejects expired OAuth bearer', async () => {
  db.mockResolvedValueOnce({ userId: 'oauth-user', scope: 'mythos:read', expiresAt: new Date(0), revokedAt: null })
  expect(await resolveReadOnlyUser('Bearer ' + token)).toBeNull()
})
test('rejects revoked OAuth bearer', async () => {
  db.mockResolvedValueOnce({ userId: 'oauth-user', scope: 'mythos:read', expiresAt: new Date(Date.now() + 60000), revokedAt: new Date() })
  expect(await resolveReadOnlyUser('Bearer ' + token)).toBeNull()
})
test('rejects OAuth bearer without read scope', async () => {
  db.mockResolvedValueOnce({ userId: 'oauth-user', scope: 'other:scope', expiresAt: new Date(Date.now() + 60000), revokedAt: null })
  expect(await resolveReadOnlyUser('Bearer ' + token)).toBeNull()
})
test('rejects missing bearer without querying database', async () => {
  expect(await resolveReadOnlyUser(null)).toBeNull()
  expect(db).not.toHaveBeenCalled()
})
test('supports explicitly configured development bearer without database lookup', async () => {
  process.env.MYTHOS_INTEGRATION_READ_TOKEN = 'x'.repeat(40)
  process.env.MYTHOS_INTEGRATION_USER_ID = 'legacy-user'
  expect(await resolveReadOnlyUser('Bearer ' + 'x'.repeat(40))).toBe('legacy-user')
  expect(db).not.toHaveBeenCalled()
})
