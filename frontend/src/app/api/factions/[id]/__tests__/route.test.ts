/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    faction: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    relation: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  faction: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
  relation: { deleteMany: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}, role: 'OWNER' | 'ADULT' | 'CHILD' = 'ADULT') {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/factions/[id]', () => {
  it('returns 404 when the faction does not exist in the caller family', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue(null)
    const response = await PUT(
      authedRequest('http://localhost/api/factions/f1', { method: 'PUT', body: JSON.stringify({ name: 'x' }) }),
      { params: { id: 'f1' } }
    )
    expect(response.status).toBe(404)
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue({ id: 'f1', authorId: 'someone-else' })
    const response = await PUT(
      authedRequest('http://localhost/api/factions/f1', { method: 'PUT', body: JSON.stringify({ name: 'x' }) }),
      { params: { id: 'f1' } }
    )
    expect(response.status).toBe(403)
  })

  it('updates the faction when the caller is the author', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue({ id: 'f1', authorId: 'user-1' })
    mockedPrisma.faction.update.mockResolvedValue({ id: 'f1', name: 'Neuer Name' })
    const response = await PUT(
      authedRequest('http://localhost/api/factions/f1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Neuer Name', goal: 'Macht ergreifen' }),
      }),
      { params: { id: 'f1' } }
    )
    expect(response.status).toBe(200)
    expect(mockedPrisma.faction.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { name: 'Neuer Name', goal: 'Macht ergreifen' },
    })
  })

  it('rejects an invalid visibility value', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue({ id: 'f1', authorId: 'user-1' })
    const response = await PUT(
      authedRequest('http://localhost/api/factions/f1', {
        method: 'PUT',
        body: JSON.stringify({ visibility: 'PUBLIC' }),
      }),
      { params: { id: 'f1' } }
    )
    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/factions/[id]', () => {
  it('returns 403 when the caller is neither author nor OWNER', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue({ id: 'f1', authorId: 'someone-else' })
    const response = await DELETE(authedRequest('http://localhost/api/factions/f1', { method: 'DELETE' }), {
      params: { id: 'f1' },
    })
    expect(response.status).toBe(403)
  })

  it('allows a family OWNER to delete a faction authored by someone else', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue({ id: 'f1', authorId: 'someone-else' })
    mockedPrisma.faction.delete.mockResolvedValue({ id: 'f1' })
    const response = await DELETE(
      authedRequest('http://localhost/api/factions/f1', { method: 'DELETE' }, 'OWNER'),
      { params: { id: 'f1' } }
    )
    expect(response.status).toBe(200)
    expect(mockedPrisma.faction.delete).toHaveBeenCalledWith({ where: { id: 'f1' } })
  })

  it('cleans up dangling Relation rows for the faction before deleting it', async () => {
    mockedPrisma.faction.findFirst.mockResolvedValue({ id: 'f1', authorId: 'user-1' })
    mockedPrisma.faction.delete.mockResolvedValue({ id: 'f1' })
    await DELETE(authedRequest('http://localhost/api/factions/f1', { method: 'DELETE' }), { params: { id: 'f1' } })
    expect(mockedPrisma.relation.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { sourceType: 'FACTION', sourceId: 'f1' },
          { targetType: 'FACTION', targetId: 'f1' },
        ],
      },
    })
  })
})
