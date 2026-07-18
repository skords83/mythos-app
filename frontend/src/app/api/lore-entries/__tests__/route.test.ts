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
    loreEntry: { findMany: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  project: { findFirst: jest.Mock }
  loreEntry: { findMany: jest.Mock; create: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/lore-entries', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/lore-entries'))
    expect(response.status).toBe(401)
  })

  it('scopes a project-bound query by family, not just the caller', async () => {
    mockedPrisma.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    mockedPrisma.loreEntry.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/lore-entries?projectId=proj-1'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj-1', user: { familyId: 'fam-1' } } })
    )
  })

  it('returns the family-wide library when no projectId is given', async () => {
    mockedPrisma.loreEntry.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/lore-entries'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.loreEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'fam-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
      })
    )
  })
})

describe('POST /api/lore-entries', () => {
  it('creates a family-library lore entry without a projectId', async () => {
    mockedPrisma.loreEntry.create.mockResolvedValue({ id: 'lore-1' })
    const request = authedRequest('http://localhost/api/lore-entries', {
      method: 'POST',
      body: JSON.stringify({ title: 'Magie kostet Lebenskraft', visibility: 'FAMILY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.loreEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY', projectId: null }),
      })
    )
  })

  it('rejects an invalid visibility value', async () => {
    const request = authedRequest('http://localhost/api/lore-entries', {
      method: 'POST',
      body: JSON.stringify({ title: 'Magie kostet Lebenskraft', visibility: 'PUBLIC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
