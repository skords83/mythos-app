/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    place: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  place: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/places/[id]', () => {
  it('updates parentId when the new parent is valid and cycle-free', async () => {
    mockedPrisma.place.findFirst
      .mockResolvedValueOnce({ id: 'place-1', authorId: 'user-1' })
      .mockResolvedValueOnce({ id: 'place-parent', parentId: null })
    mockedPrisma.place.update.mockResolvedValue({ id: 'place-1', parentId: 'place-parent' })

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ parentId: 'place-parent' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(200)
    expect(mockedPrisma.place.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'place-1' }, data: expect.objectContaining({ parentId: 'place-parent' }) })
    )
  })

  it('rejects a place being its own parent', async () => {
    mockedPrisma.place.findFirst.mockResolvedValueOnce({ id: 'place-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ parentId: 'place-1' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.place.update).not.toHaveBeenCalled()
  })

  it('rejects a parentId that does not belong to the family', async () => {
    mockedPrisma.place.findFirst
      .mockResolvedValueOnce({ id: 'place-1', authorId: 'user-1' })
      .mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ parentId: 'missing-place' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(404)
    expect(mockedPrisma.place.update).not.toHaveBeenCalled()
  })

  it('rejects a reassignment that would create a cycle', async () => {
    // place-2 is already a child of place-1; setting place-1.parentId = place-2 would create a 2-hop cycle
    mockedPrisma.place.findFirst
      .mockResolvedValueOnce({ id: 'place-1', authorId: 'user-1' })
      .mockResolvedValueOnce({ id: 'place-2', parentId: 'place-1' })
    mockedPrisma.place.findUnique.mockResolvedValueOnce({ id: 'place-1', parentId: null })

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ parentId: 'place-2' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.place.update).not.toHaveBeenCalled()
  })

  it('rejects setting visibility to FAMILY when the (unchanged) parent is PRIVATE', async () => {
    mockedPrisma.place.findFirst
      .mockResolvedValueOnce({ id: 'place-1', authorId: 'user-1', visibility: 'PRIVATE', parentId: 'place-parent' })
      .mockResolvedValueOnce({ id: 'place-parent', visibility: 'PRIVATE' })

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'FAMILY' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.place.update).not.toHaveBeenCalled()
  })

  it('rejects reassigning to a PRIVATE parent while keeping FAMILY visibility', async () => {
    mockedPrisma.place.findFirst
      .mockResolvedValueOnce({ id: 'place-1', authorId: 'user-1', visibility: 'FAMILY', parentId: null })
      .mockResolvedValueOnce({ id: 'place-parent', parentId: null, visibility: 'PRIVATE' })

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ parentId: 'place-parent' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.place.update).not.toHaveBeenCalled()
  })

  it('cascades a FAMILY -> PRIVATE demotion to FAMILY descendants', async () => {
    mockedPrisma.place.findFirst.mockResolvedValueOnce({
      id: 'place-1',
      authorId: 'user-1',
      visibility: 'FAMILY',
      parentId: null,
    })
    mockedPrisma.place.update.mockResolvedValue({ id: 'place-1', visibility: 'PRIVATE' })
    mockedPrisma.place.findMany
      .mockResolvedValueOnce([{ id: 'place-child' }])
      .mockResolvedValueOnce([])

    const request = authedRequest('http://localhost/api/places/place-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PRIVATE' }),
    })
    const response = await PUT(request, { params: { id: 'place-1' } })
    expect(response.status).toBe(200)
    expect(mockedPrisma.place.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['place-child'] } },
      data: { visibility: 'PRIVATE' },
    })
  })
})
