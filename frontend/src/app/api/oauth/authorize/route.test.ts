/** @jest-environment node */
jest.mock('@/lib/rateLimit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null), getClientIp: () => 'test' }))
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    oAuthClient: { findUnique: jest.fn() },
    oAuthAuthorizationCode: { create: jest.fn() },
  },
}))
jest.mock('@/lib/auth', () => ({ getUserFromRequest: jest.fn() }))

const db = prisma as jest.Mocked<typeof prisma>
const challenge = 'a'.repeat(43)
const data = {
  client_id: 'chatgpt', redirect_uri: 'https://client.example/callback',
  code_challenge: challenge, code_challenge_method: 'S256',
  response_type: 'code', scope: 'mythos:read', state: 'some-state-123',
  resource: 'https://mythos.example/api/integrations/mcp',
  consent: true,
}
const req = (body: object = data, origin = 'https://mythos.example') =>
  new NextRequest('https://mythos.example/api/oauth/authorize', {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
beforeEach(() => {
  process.env.MYTHOS_OAUTH_ISSUER = 'https://mythos.example'
  jest.clearAllMocks()
  ;(getUserFromRequest as jest.Mock).mockResolvedValue('user-1')
  ;(db.oAuthClient.findUnique as jest.Mock).mockResolvedValue({
    id: 'chatgpt', name: 'ChatGPT', redirectUris: ['https://client.example/callback'],
  })
  ;(db.oAuthAuthorizationCode.create as jest.Mock).mockResolvedValue({ id: 'code-1' })
})
test('issues a short-lived read-only authorization code after consent', async () => {
  const response = await POST(req())
  expect(response.status).toBe(200)
  const redirect = new URL((await response.json()).redirect_to)
  expect(redirect.origin).toBe('https://client.example')
  expect(redirect.searchParams.get('state')).toBe('some-state-123')
  expect(redirect.searchParams.get('code')).toBeTruthy()
  const created = (db.oAuthAuthorizationCode.create as jest.Mock).mock.calls[0][0].data
  expect(created.userId).toBe('user-1')
  expect(created.scope).toBe('mythos:read')
  expect(created.codeHash).not.toBe(redirect.searchParams.get('code'))
})
test('requires logged-in Mythos user', async () => {
  ;(getUserFromRequest as jest.Mock).mockResolvedValue(null)
  expect((await POST(req())).status).toBe(401)
})
test('requires explicit consent', async () => {
  expect((await POST(req({ ...data, consent: false }))).status).toBe(400)
})
test('rejects cross-site requests', async () => {
  expect((await POST(req(data, 'https://evil.example'))).status).toBe(403)
})
test('rejects unregistered redirect URI', async () => {
  expect((await POST(req({ ...data, redirect_uri: 'https://evil.example/callback' }))).status).toBe(400)
  expect(db.oAuthAuthorizationCode.create).not.toHaveBeenCalled()
})
test('rejects non-read-only scope and non-S256 challenge', async () => {
  expect((await POST(req({ ...data, scope: 'mythos:write' }))).status).toBe(400)
  expect((await POST(req({ ...data, code_challenge_method: 'plain' }))).status).toBe(400)
})

test('GET returns the registered client name without issuing credentials', async () => {
  const url = new URL('https://mythos.example/api/oauth/authorize')
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'consent') url.searchParams.set(key, String(value))
  })
  const response = await GET(new NextRequest(url))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    issuer: 'https://mythos.example', client_id: 'chatgpt', client_name: 'ChatGPT', scope: 'mythos:read', redirect_uri: 'https://client.example/callback',
  })
  expect(db.oAuthAuthorizationCode.create).not.toHaveBeenCalled()
})

test('GET rejects an unregistered redirect URI', async () => {
  const url = new URL('https://mythos.example/api/oauth/authorize')
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'consent') url.searchParams.set(key, String(value))
  })
  url.searchParams.set('redirect_uri', 'https://evil.example/callback')
  const response = await GET(new NextRequest(url))
  expect(response.status).toBe(400)
  expect(db.oAuthAuthorizationCode.create).not.toHaveBeenCalled()
})

test.each([null, [], 'text', 42])('rejects a non-object consent body %p', async body => {
  expect((await POST(req(body as never))).status).toBe(400)
  expect(db.oAuthAuthorizationCode.create).not.toHaveBeenCalled()
})
test('requires the exact MCP resource', async () => {
  expect((await POST(req({ ...data, resource: 'https://other.example/mcp' }))).status).toBe(400)
  expect((await POST(req({ ...data, resource: undefined }))).status).toBe(400)
})
test('rejects duplicate authorization parameters', async () => {
  const params = new URLSearchParams(Object.entries(data).map(([key, value]) => [key, String(value)]))
  params.append('resource', data.resource)
  expect((await GET(new NextRequest('https://mythos.example/api/oauth/authorize?' + params))).status).toBe(400)
})
