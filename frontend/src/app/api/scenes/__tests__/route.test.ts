/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    chapter: { findFirst: jest.fn() },
    scene: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  chapter: { findFirst: jest.Mock }
  scene: { findMany: jest.Mock; create: jest.Mock; count: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/scenes', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/scenes?chapterId=chap-1'))
    expect(response.status).toBe(401)
  })

  it('returns 400 when chapterId is missing', async () => {
    const response = await GET(authedRequest('http://localhost/api/scenes'))
    expect(response.status).toBe(400)
  })

  it('returns 404 when the chapter is not found for the caller family', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue(null)
    const response = await GET(authedRequest('http://localhost/api/scenes?chapterId=chap-1'))
    expect(response.status).toBe(404)
  })

  it('scopes the query by chapter and family', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue({ id: 'chap-1' })
    mockedPrisma.scene.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/scenes?chapterId=chap-1'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.chapter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'chap-1', project: { user: { familyId: 'fam-1' } } } })
    )
    expect(mockedPrisma.scene.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chapterId: 'chap-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
        orderBy: { order: 'asc' },
      })
    )
  })
})

describe('POST /api/scenes', () => {
  it('creates a scene appended to the end of the chapter', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue({ id: 'chap-1' })
    mockedPrisma.scene.count.mockResolvedValue(2)
    mockedPrisma.scene.create.mockResolvedValue({ id: 'scene-1' })
    const request = authedRequest('http://localhost/api/scenes', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1', name: 'Der Aufbruch', visibility: 'FAMILY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.scene.count).toHaveBeenCalledWith({ where: { chapterId: 'chap-1' } })
    expect(mockedPrisma.scene.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: 'fam-1',
          authorId: 'user-1',
          visibility: 'FAMILY',
          chapterId: 'chap-1',
          order: 2,
        }),
      })
    )
  })

  it('returns 400 when chapterId is missing', async () => {
    const request = authedRequest('http://localhost/api/scenes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Der Aufbruch' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 404 when the chapter is not found for the caller family', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue(null)
    const request = authedRequest('http://localhost/api/scenes', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1', name: 'Der Aufbruch' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(404)
  })

  it('rejects an invalid visibility value', async () => {
    const request = authedRequest('http://localhost/api/scenes', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1', name: 'Der Aufbruch', visibility: 'PUBLIC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
