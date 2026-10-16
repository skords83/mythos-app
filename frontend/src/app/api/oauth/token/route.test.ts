/** @jest-environment node */
jest.mock('@/lib/rateLimit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null), getClientIp: () => 'test' }))
import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { POST } from './route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    oAuthAuthorizationCode: { findUnique: jest.fn(), updateMany: jest.fn() },
    oAuthAccessToken: { create: jest.fn() },
  },
}))

const db = prisma as jest.Mocked<typeof prisma>
const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'
const challenge = createHash('sha256').update(verifier).digest('base64url')
const valid = {
  resource: 'https://mythos.example/api/integrations/mcp', scope: 'mythos:read',
  id: 'code-id', clientId: 'client-1', userId: 'user-1',
  redirectUri: 'https://example.org/callback', codeChallenge: challenge,
  consumedAt: null, expiresAt: new Date(Date.now() + 60000),
}
const request = (overrides: Record<string, string> = {}) => {
  const body = new URLSearchParams({
    resource: 'https://mythos.example/api/integrations/mcp',
    grant_type: 'authorization_code', client_id: 'client-1',
    code: 'opaque-code', code_verifier: verifier,
    redirect_uri: 'https://example.org/callback', ...overrides,
  })
  return new NextRequest('https://mythos.example/api/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
}
beforeEach(() => {
  process.env.MYTHOS_OAUTH_ISSUER = 'https://mythos.example'
  jest.clearAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(db))
  ;(db.oAuthAuthorizationCode.findUnique as jest.Mock).mockResolvedValue({ ...valid })
  ;(db.oAuthAuthorizationCode.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
  ;(db.oAuthAccessToken.create as jest.Mock).mockResolvedValue({ id: 'token-id' })
})
test('exchanges a valid code for a one-hour read-only bearer token', async () => {
  const response = await POST(request())
  const result = await response.json()
  expect(response.status).toBe(200)
  expect(result.token_type).toBe('Bearer')
  expect(result.scope).toBe('mythos:read')
  expect(result.expires_in).toBe(3600)
  expect(result.access_token).toBeTruthy()
  const created = (db.oAuthAccessToken.create as jest.Mock).mock.calls[0][0].data
  expect(created.tokenHash).not.toBe(result.access_token)
  expect(created.userId).toBe('user-1')
})
test('rejects an expired code', async () => {
  ;(db.oAuthAuthorizationCode.findUnique as jest.Mock).mockResolvedValue({ ...valid, expiresAt: new Date(0) })
  expect((await POST(request())).status).toBe(400)
  expect(db.oAuthAccessToken.create).not.toHaveBeenCalled()
})
test('rejects a previously consumed code', async () => {
  ;(db.oAuthAuthorizationCode.findUnique as jest.Mock).mockResolvedValue({ ...valid, consumedAt: new Date() })
  expect((await POST(request())).status).toBe(400)
})
test('rejects a wrong PKCE verifier', async () => {
  expect((await POST(request({ code_verifier: verifier + 'x' }))).status).toBe(400)
})
test('rejects mismatched redirect URI', async () => {
  expect((await POST(request({ redirect_uri: 'https://evil.example/callback' }))).status).toBe(400)
})
test('rejects a concurrently redeemed code', async () => {
  ;(db.oAuthAuthorizationCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
  expect((await POST(request())).status).toBe(400)
  expect(db.oAuthAccessToken.create).not.toHaveBeenCalled()
})
test('rejects unsupported grant type', async () => {
  expect((await POST(request({ grant_type: 'password' }))).status).toBe(400)
})

test('rejects unbound and differently bound authorization codes', async () => {
  for (const resource of [null, 'https://other.example/mcp']) {
    ;(db.oAuthAuthorizationCode.findUnique as jest.Mock).mockResolvedValueOnce({ ...valid, resource })
    expect((await POST(request())).status).toBe(400)
  }
})
test('rejects scope escalation stored on a code', async () => {
  ;(db.oAuthAuthorizationCode.findUnique as jest.Mock).mockResolvedValueOnce({ ...valid, scope: 'mythos:read mythos:write' })
  expect((await POST(request())).status).toBe(400)
})
test('rejects token requests for a different resource', async () => {
  const response = await POST(request({ resource: 'https://other.example/mcp' }))
  expect(await response.json()).toEqual({ error: 'invalid_target' })
})
