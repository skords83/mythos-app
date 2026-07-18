/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn() },
    place: { findFirst: jest.fn() },
    relation: { findMany: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  character: { findFirst: jest.Mock }
  place: { findFirst: jest.Mock }
  relation: { findMany: jest.Mock; create: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/relations', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/relations?entityType=CHARACTER&entityId=c1'))
    expect(response.status).toBe(401)
  })

  it('returns 400 when entityType/entityId are missing', async () => {
    const response = await GET(authedRequest('http://localhost/api/relations'))
    expect(response.status).toBe(400)
  })

  it('returns 404 when the anchor entity does not exist', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce(null)
    const response = await GET(authedRequest('http://localhost/api/relations?entityType=CHARACTER&entityId=missing'))
    expect(response.status).toBe(404)
  })

  it('resolves the counterpart and filters out relations whose counterpart is not visible (Z2 Association rule)', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({
      id: 'c1', familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY',
    })
    mockedPrisma.relation.findMany.mockResolvedValueOnce([
      { id: 'rel-visible', sourceType: 'CHARACTER', sourceId: 'c1', targetType: 'PLACE', targetId: 'p-visible', relationType: 'LIVES_IN' },
      { id: 'rel-hidden', sourceType: 'CHARACTER', sourceId: 'c1', targetType: 'PLACE', targetId: 'p-hidden', relationType: 'LIVES_IN' },
    ])
    mockedPrisma.place.findFirst
      .mockResolvedValueOnce({ id: 'p-visible', familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY' })
      .mockResolvedValueOnce({ id: 'p-hidden', familyId: 'fam-1', authorId: 'other-user', visibility: 'PRIVATE' })

    const response = await GET(authedRequest('http://localhost/api/relations?entityType=CHARACTER&entityId=c1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('rel-visible')
  })
})

describe('POST /api/relations', () => {
  it('returns 400 for an invalid sourceType/targetType', async () => {
    const request = authedRequest('http://localhost/api/relations', {
      method: 'POST',
      body: JSON.stringify({ sourceType: 'ORGANIZATION', sourceId: 'x', targetType: 'PLACE', targetId: 'y', relationType: 'MEMBER_OF' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('rejects a self-relation', async () => {
    const request = authedRequest('http://localhost/api/relations', {
      method: 'POST',
      body: JSON.stringify({ sourceType: 'CHARACTER', sourceId: 'c1', targetType: 'CHARACTER', targetId: 'c1', relationType: 'RIVAL_OF' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(mockedPrisma.relation.create).not.toHaveBeenCalled()
  })

  it('returns 404 when the source entity does not exist in this family', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce(null)
    mockedPrisma.place.findFirst.mockResolvedValueOnce({ id: 'p1', familyId: 'fam-1', authorId: 'user-1', visibility: 'PRIVATE' })

    const request = authedRequest('http://localhost/api/relations', {
      method: 'POST',
      body: JSON.stringify({ sourceType: 'CHARACTER', sourceId: 'missing', targetType: 'PLACE', targetId: 'p1', relationType: 'LIVES_IN' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(404)
  })

  it('creates a relation scoped to the caller family and author', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'c1', familyId: 'fam-1', authorId: 'user-1', visibility: 'PRIVATE' })
    mockedPrisma.place.findFirst.mockResolvedValueOnce({ id: 'p1', familyId: 'fam-1', authorId: 'user-1', visibility: 'PRIVATE' })
    mockedPrisma.relation.create.mockResolvedValue({ id: 'rel-1' })

    const request = authedRequest('http://localhost/api/relations', {
      method: 'POST',
      body: JSON.stringify({ sourceType: 'CHARACTER', sourceId: 'c1', targetType: 'PLACE', targetId: 'p1', relationType: 'LIVES_IN' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(mockedPrisma.relation.create).toHaveBeenCalledWith({
      data: {
        sourceType: 'CHARACTER',
        sourceId: 'c1',
        targetType: 'PLACE',
        targetId: 'p1',
        relationType: 'LIVES_IN',
        label: null,
        familyId: 'fam-1',
        authorId: 'user-1',
      },
    })
  })
})
