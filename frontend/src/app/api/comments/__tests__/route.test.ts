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
    comment: { findMany: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  chapter: { findFirst: jest.Mock }
  comment: { findMany: jest.Mock; create: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/comments', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/comments?chapterId=chap-1'))
    expect(response.status).toBe(401)
  })

  it('returns 400 when chapterId is missing', async () => {
    const response = await GET(authedRequest('http://localhost/api/comments'))
    expect(response.status).toBe(400)
  })

  it('returns 404 when the chapter is not found for the caller family', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue(null)
    const response = await GET(authedRequest('http://localhost/api/comments?chapterId=chap-1'))
    expect(response.status).toBe(404)
  })

  it('scopes the query by chapter and family, ordered by creation time', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue({ id: 'chap-1' })
    mockedPrisma.comment.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/comments?chapterId=chap-1'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.chapter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'chap-1', project: { user: { familyId: 'fam-1' } } } })
    )
    expect(mockedPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chapterId: 'chap-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
        orderBy: { createdAt: 'asc' },
      })
    )
  })
})

describe('POST /api/comments', () => {
  it('creates a comment on the chapter', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue({ id: 'chap-1' })
    mockedPrisma.comment.create.mockResolvedValue({ id: 'comment-1' })
    const request = authedRequest('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1', content: 'Bitte überarbeiten', visibility: 'FAMILY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: 'fam-1',
          authorId: 'user-1',
          visibility: 'FAMILY',
          chapterId: 'chap-1',
          content: 'Bitte überarbeiten',
        }),
      })
    )
  })

  it('returns 400 when chapterId is missing', async () => {
    const request = authedRequest('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'Bitte überarbeiten' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when content is missing', async () => {
    const request = authedRequest('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 404 when the chapter is not found for the caller family', async () => {
    mockedPrisma.chapter.findFirst.mockResolvedValue(null)
    const request = authedRequest('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1', content: 'Bitte überarbeiten' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(404)
  })

  it('rejects an invalid visibility value', async () => {
    const request = authedRequest('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({ chapterId: 'chap-1', content: 'Bitte überarbeiten', visibility: 'PUBLIC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
