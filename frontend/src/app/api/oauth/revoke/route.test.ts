/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

jest.mock('@/lib/prisma', () => ({
  prisma: { oAuthAccessToken: { updateMany: jest.fn() } },
}))
jest.mock('@/lib/auth', () => ({ getUserFromRequest: jest.fn() }))

const request = (origin = 'https://mythos.example', tokenId: unknown = 'token-1') =>
  new NextRequest('https://mythos.example/api/oauth/revoke', {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ tokenId }),
  })

beforeEach(() => {
  jest.clearAllMocks()
  ;(getUserFromRequest as jest.Mock).mockResolvedValue('user-1')
  ;(prisma.oAuthAccessToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
})
test('revokes only tokens owned by the signed-in user', async () => {
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ revoked: true })
  expect(prisma.oAuthAccessToken.updateMany).toHaveBeenCalledWith({
    where: { id: 'token-1', userId: 'user-1', revokedAt: null },
    data: { revokedAt: expect.any(Date) },
  })
})
test('rejects unauthenticated requests', async () => {
  ;(getUserFromRequest as jest.Mock).mockResolvedValue(null)
  expect((await POST(request())).status).toBe(401)
  expect(prisma.oAuthAccessToken.updateMany).not.toHaveBeenCalled()
})
test('rejects cross-origin revocation', async () => {
  expect((await POST(request('https://other.example'))).status).toBe(403)
})
test('rejects invalid token ids', async () => {
  expect((await POST(request('https://mythos.example', null))).status).toBe(400)
})
test('does not revoke another user token', async () => {
  ;(prisma.oAuthAccessToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
  expect(await (await POST(request())).json()).toEqual({ revoked: false })
})
