/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    idea: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  idea: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/ideas/[id]', () => {
  it('rejects an invalid visibility value', async () => {
    mockedPrisma.idea.findFirst.mockResolvedValueOnce({ id: 'idea-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/ideas/idea-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PUBLIC' }),
    })
    const response = await PUT(request, { params: { id: 'idea-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.idea.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.idea.findFirst.mockResolvedValueOnce({ id: 'idea-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/ideas/idea-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Neuer Titel' }),
    })
    const response = await PUT(request, { params: { id: 'idea-1' } })
    expect(response.status).toBe(403)
  })
})

describe('DELETE /api/ideas/[id]', () => {
  it('deletes the idea when the caller is the author', async () => {
    mockedPrisma.idea.findFirst.mockResolvedValueOnce({ id: 'idea-1', authorId: 'user-1' })
    mockedPrisma.idea.delete.mockResolvedValue({ id: 'idea-1' })

    const request = authedRequest('http://localhost/api/ideas/idea-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'idea-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.idea.delete).toHaveBeenCalledWith({ where: { id: 'idea-1' } })
  })

  it('returns 403 when the caller is neither author nor family OWNER', async () => {
    mockedPrisma.idea.findFirst.mockResolvedValueOnce({ id: 'idea-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/ideas/idea-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'idea-1' } })

    expect(response.status).toBe(403)
    expect(mockedPrisma.idea.delete).not.toHaveBeenCalled()
  })

  it('returns 404 when the idea does not exist', async () => {
    mockedPrisma.idea.findFirst.mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/ideas/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
  })
})
