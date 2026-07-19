/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    comment: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  comment: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}, role: string = 'ADULT') {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: role as any })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/comments/[id]', () => {
  it('rejects an invalid visibility value', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/comments/comment-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PUBLIC' }),
    })
    const response = await PUT(request, { params: { id: 'comment-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.comment.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is not the author or an OWNER', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/comments/comment-1', {
      method: 'PUT',
      body: JSON.stringify({ resolved: true }),
    })
    const response = await PUT(request, { params: { id: 'comment-1' } })
    expect(response.status).toBe(403)
  })

  it('allows an OWNER to resolve a comment authored by someone else', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'other-user' })
    mockedPrisma.comment.update.mockResolvedValue({ id: 'comment-1', resolved: true })

    const request = authedRequest(
      'http://localhost/api/comments/comment-1',
      { method: 'PUT', body: JSON.stringify({ resolved: true }) },
      'OWNER'
    )
    const response = await PUT(request, { params: { id: 'comment-1' } })
    expect(response.status).toBe(200)
  })

  it('updates the resolved flag along with other fields', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'user-1' })
    mockedPrisma.comment.update.mockResolvedValue({ id: 'comment-1', resolved: true })

    const request = authedRequest('http://localhost/api/comments/comment-1', {
      method: 'PUT',
      body: JSON.stringify({ resolved: true }),
    })
    const response = await PUT(request, { params: { id: 'comment-1' } })
    expect(response.status).toBe(200)
    expect(mockedPrisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comment-1' },
        data: { resolved: true },
      })
    )
  })

  it('returns 400 when content is set to an empty string', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/comments/comment-1', {
      method: 'PUT',
      body: JSON.stringify({ content: '   ' }),
    })
    const response = await PUT(request, { params: { id: 'comment-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.comment.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/comments/[id]', () => {
  it('deletes the comment', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'user-1' })
    mockedPrisma.comment.delete.mockResolvedValue({ id: 'comment-1' })

    const request = authedRequest('http://localhost/api/comments/comment-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'comment-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'comment-1' } })
  })

  it('returns 403 when the caller is not the author or an OWNER', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'comment-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/comments/comment-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'comment-1' } })

    expect(response.status).toBe(403)
    expect(mockedPrisma.comment.delete).not.toHaveBeenCalled()
  })

  it('returns 404 when the comment does not exist', async () => {
    mockedPrisma.comment.findFirst.mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/comments/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
    expect(mockedPrisma.comment.delete).not.toHaveBeenCalled()
  })
})
