/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    relation: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  relation: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}, role: 'ADULT' | 'OWNER' = 'ADULT') {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/relations/[id]', () => {
  it('returns 404 when the relation does not exist in this family', async () => {
    mockedPrisma.relation.findFirst.mockResolvedValueOnce(null)
    const request = authedRequest('http://localhost/api/relations/rel-1', {
      method: 'PUT',
      body: JSON.stringify({ label: 'Vater von' }),
    })
    const response = await PUT(request, { params: { id: 'rel-1' } })
    expect(response.status).toBe(404)
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.relation.findFirst.mockResolvedValueOnce({ id: 'rel-1', authorId: 'other-user' })
    const request = authedRequest('http://localhost/api/relations/rel-1', {
      method: 'PUT',
      body: JSON.stringify({ label: 'Vater von' }),
    })
    const response = await PUT(request, { params: { id: 'rel-1' } })
    expect(response.status).toBe(403)
  })

  it('updates relationType and label', async () => {
    mockedPrisma.relation.findFirst.mockResolvedValueOnce({ id: 'rel-1', authorId: 'user-1' })
    mockedPrisma.relation.update.mockResolvedValue({ id: 'rel-1', relationType: 'PARENT_OF', label: 'Vater von' })

    const request = authedRequest('http://localhost/api/relations/rel-1', {
      method: 'PUT',
      body: JSON.stringify({ relationType: 'PARENT_OF', label: 'Vater von' }),
    })
    const response = await PUT(request, { params: { id: 'rel-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.relation.update).toHaveBeenCalledWith({
      where: { id: 'rel-1' },
      data: { relationType: 'PARENT_OF', label: 'Vater von' },
    })
  })
})

describe('DELETE /api/relations/[id]', () => {
  it('returns 404 when the relation does not exist in this family', async () => {
    mockedPrisma.relation.findFirst.mockResolvedValueOnce(null)
    const response = await DELETE(authedRequest('http://localhost/api/relations/rel-1', { method: 'DELETE' }), {
      params: { id: 'rel-1' },
    })
    expect(response.status).toBe(404)
  })

  it('returns 403 when the caller is neither author nor OWNER', async () => {
    mockedPrisma.relation.findFirst.mockResolvedValueOnce({ id: 'rel-1', authorId: 'other-user' })
    const response = await DELETE(authedRequest('http://localhost/api/relations/rel-1', { method: 'DELETE' }), {
      params: { id: 'rel-1' },
    })
    expect(response.status).toBe(403)
    expect(mockedPrisma.relation.delete).not.toHaveBeenCalled()
  })

  it('allows a family OWNER to delete a relation authored by someone else', async () => {
    mockedPrisma.relation.findFirst.mockResolvedValueOnce({ id: 'rel-1', authorId: 'other-user' })
    mockedPrisma.relation.delete.mockResolvedValue({ id: 'rel-1' })

    const response = await DELETE(
      authedRequest('http://localhost/api/relations/rel-1', { method: 'DELETE' }, 'OWNER'),
      { params: { id: 'rel-1' } }
    )

    expect(response.status).toBe(200)
    expect(mockedPrisma.relation.delete).toHaveBeenCalledWith({ where: { id: 'rel-1' } })
  })
})
