/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    item: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    relation: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  item: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
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

describe('PUT /api/items/[id]', () => {
  it('rejects an invalid visibility value', async () => {
    mockedPrisma.item.findFirst.mockResolvedValueOnce({ id: 'item-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/items/item-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PUBLIC' }),
    })
    const response = await PUT(request, { params: { id: 'item-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.item.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.item.findFirst.mockResolvedValueOnce({ id: 'item-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/items/item-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Neuer Name' }),
    })
    const response = await PUT(request, { params: { id: 'item-1' } })
    expect(response.status).toBe(403)
  })
})

describe('DELETE /api/items/[id]', () => {
  it('deletes relations referencing the item before deleting it (Z5 cascade)', async () => {
    mockedPrisma.item.findFirst.mockResolvedValueOnce({ id: 'item-1', authorId: 'user-1' })
    mockedPrisma.relation.deleteMany.mockResolvedValue({ count: 1 })
    mockedPrisma.item.delete.mockResolvedValue({ id: 'item-1' })

    const request = authedRequest('http://localhost/api/items/item-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'item-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.relation.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ sourceType: 'ITEM', sourceId: 'item-1' }, { targetType: 'ITEM', targetId: 'item-1' }] },
    })
    expect(mockedPrisma.item.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } })
  })

  it('returns 403 without touching relations when the caller is not the author', async () => {
    mockedPrisma.item.findFirst.mockResolvedValueOnce({ id: 'item-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/items/item-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'item-1' } })

    expect(response.status).toBe(403)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
    expect(mockedPrisma.item.delete).not.toHaveBeenCalled()
  })

  it('returns 404 without touching relations when the item does not exist', async () => {
    mockedPrisma.item.findFirst.mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/items/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
  })
})
