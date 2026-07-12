/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    place: { findMany: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  project: { findFirst: jest.Mock }
  place: { findMany: jest.Mock; create: jest.Mock }
}

function authedRequest(url: string, init: RequestInit = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/places', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/places'))
    expect(response.status).toBe(401)
  })

  it('scopes a project-bound query by family, not just the caller', async () => {
    mockedPrisma.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    mockedPrisma.place.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/places?projectId=proj-1'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj-1', user: { familyId: 'fam-1' } } })
    )
  })

  it('returns the family-wide library when no projectId is given', async () => {
    mockedPrisma.place.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/places'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.place.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'fam-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
      })
    )
  })
})

describe('POST /api/places', () => {
  it('creates a family-library place without a projectId', async () => {
    mockedPrisma.place.create.mockResolvedValue({ id: 'place-1' })
    const request = authedRequest('http://localhost/api/places', {
      method: 'POST',
      body: JSON.stringify({ name: 'Eldoria', visibility: 'FAMILY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.place.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY', projectId: null }),
      })
    )
  })

  it('rejects an invalid visibility value', async () => {
    const request = authedRequest('http://localhost/api/places', {
      method: 'POST',
      body: JSON.stringify({ name: 'Eldoria', visibility: 'PUBLIC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
