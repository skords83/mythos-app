/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    loreEntry: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    relation: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  loreEntry: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
  relation: { deleteMany: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/lore-entries/[id]', () => {
  it('rejects an invalid visibility value', async () => {
    mockedPrisma.loreEntry.findFirst.mockResolvedValueOnce({ id: 'lore-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/lore-entries/lore-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PUBLIC' }),
    })
    const response = await PUT(request, { params: { id: 'lore-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.loreEntry.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.loreEntry.findFirst.mockResolvedValueOnce({ id: 'lore-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/lore-entries/lore-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Neuer Titel' }),
    })
    const response = await PUT(request, { params: { id: 'lore-1' } })
    expect(response.status).toBe(403)
  })
})

describe('DELETE /api/lore-entries/[id]', () => {
  it('deletes relations referencing the lore entry before deleting it (Z5 cascade)', async () => {
    mockedPrisma.loreEntry.findFirst.mockResolvedValueOnce({ id: 'lore-1', authorId: 'user-1' })
    mockedPrisma.relation.deleteMany.mockResolvedValue({ count: 1 })
    mockedPrisma.loreEntry.delete.mockResolvedValue({ id: 'lore-1' })

    const request = authedRequest('http://localhost/api/lore-entries/lore-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'lore-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.relation.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ sourceType: 'LORE_ENTRY', sourceId: 'lore-1' }, { targetType: 'LORE_ENTRY', targetId: 'lore-1' }] },
    })
    expect(mockedPrisma.loreEntry.delete).toHaveBeenCalledWith({ where: { id: 'lore-1' } })
  })

  it('returns 403 without touching relations when the caller is not the author', async () => {
    mockedPrisma.loreEntry.findFirst.mockResolvedValueOnce({ id: 'lore-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/lore-entries/lore-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'lore-1' } })

    expect(response.status).toBe(403)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
    expect(mockedPrisma.loreEntry.delete).not.toHaveBeenCalled()
  })

  it('returns 404 without touching relations when the lore entry does not exist', async () => {
    mockedPrisma.loreEntry.findFirst.mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/lore-entries/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
  })
})
