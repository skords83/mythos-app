/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    placeImage: { findFirst: jest.fn(), delete: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  placeImage: { findFirst: jest.Mock; delete: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DELETE /api/places/[id]/images/[imageId]', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await DELETE(new NextRequest('http://localhost/api/places/place-1/images/img-1', { method: 'DELETE' }), {
      params: { id: 'place-1', imageId: 'img-1' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when the image does not exist', async () => {
    mockedPrisma.placeImage.findFirst.mockResolvedValue(null)
    const request = authedRequest('http://localhost/api/places/place-1/images/img-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'place-1', imageId: 'img-1' } })
    expect(response.status).toBe(404)
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.placeImage.findFirst.mockResolvedValue({ id: 'img-1', authorId: 'someone-else' })
    const request = authedRequest('http://localhost/api/places/place-1/images/img-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'place-1', imageId: 'img-1' } })
    expect(response.status).toBe(403)
    expect(mockedPrisma.placeImage.delete).not.toHaveBeenCalled()
  })

  it('deletes the image for the author', async () => {
    mockedPrisma.placeImage.findFirst.mockResolvedValue({ id: 'img-1', authorId: 'user-1' })
    mockedPrisma.placeImage.delete.mockResolvedValue({ id: 'img-1' })
    const request = authedRequest('http://localhost/api/places/place-1/images/img-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'place-1', imageId: 'img-1' } })
    expect(response.status).toBe(200)
    expect(mockedPrisma.placeImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } })
  })
})
