/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    place: { findFirst: jest.fn() },
    placeImage: { create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  place: { findFirst: jest.Mock }
  placeImage: { create: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/places/[id]/images', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await POST(new NextRequest('http://localhost/api/places/place-1/images', { method: 'POST' }), {
      params: { id: 'place-1' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when the place does not exist', async () => {
    mockedPrisma.place.findFirst.mockResolvedValue(null)
    const request = authedRequest('http://localhost/api/places/place-1/images', {
      method: 'POST',
      body: JSON.stringify({ url: '/api/upload/x.png' }),
    })
    const response = await POST(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(404)
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.place.findFirst.mockResolvedValue({ id: 'place-1', authorId: 'someone-else' })
    const request = authedRequest('http://localhost/api/places/place-1/images', {
      method: 'POST',
      body: JSON.stringify({ url: '/api/upload/x.png' }),
    })
    const response = await POST(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(403)
    expect(mockedPrisma.placeImage.create).not.toHaveBeenCalled()
  })

  it('rejects a missing url', async () => {
    mockedPrisma.place.findFirst.mockResolvedValue({ id: 'place-1', authorId: 'user-1' })
    const request = authedRequest('http://localhost/api/places/place-1/images', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.placeImage.create).not.toHaveBeenCalled()
  })

  it('creates an image for the author', async () => {
    mockedPrisma.place.findFirst.mockResolvedValue({ id: 'place-1', authorId: 'user-1' })
    mockedPrisma.placeImage.create.mockResolvedValue({ id: 'img-1', placeId: 'place-1', url: '/api/upload/x.png' })
    const request = authedRequest('http://localhost/api/places/place-1/images', {
      method: 'POST',
      body: JSON.stringify({ url: '/api/upload/x.png' }),
    })
    const response = await POST(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(201)
    expect(mockedPrisma.placeImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ placeId: 'place-1', familyId: 'fam-1', authorId: 'user-1', url: '/api/upload/x.png' }),
      })
    )
  })
})
