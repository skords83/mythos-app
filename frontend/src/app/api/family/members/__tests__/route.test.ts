/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

const mockedPrisma = prisma as unknown as {
  user: {
    findMany: jest.Mock
    findUnique: jest.Mock
    create: jest.Mock
  }
}

function requestWithRole(role: 'OWNER' | 'ADULT' | 'CHILD', url = 'http://localhost/api/family/members', init: RequestInit = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role })
  return new NextRequest(url, {
    ...init,
    headers: { ...(init.headers || {}), cookie: `auth-token=${token}` },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/family/members', () => {
  it('returns 401 without an auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/family/members')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('lists members of the caller\'s family for any role', async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'a@example.com', name: 'Anna', role: 'OWNER', createdAt: new Date() },
    ])
    const response = await GET(requestWithRole('CHILD'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'fam-1' } })
    )
  })
})

describe('POST /api/family/members', () => {
  it('returns 401 without an auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/family/members', { method: 'POST', body: '{}' })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 403 when the caller is not OWNER', async () => {
    const request = requestWithRole('ADULT', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'kid@example.com', password: 'password123', role: 'CHILD' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('creates a family member when the caller is OWNER', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-2', email: 'kid@example.com', name: 'kid', role: 'CHILD', createdAt: new Date(),
    })
    const request = requestWithRole('OWNER', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'kid@example.com', password: 'password123', role: 'CHILD' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ familyId: 'fam-1', role: 'CHILD' }) })
    )
  })

  it('rejects an invalid role', async () => {
    const request = requestWithRole('OWNER', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'kid@example.com', password: 'password123', role: 'OWNER' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
