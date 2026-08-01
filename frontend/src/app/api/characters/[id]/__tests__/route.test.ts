/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    relation: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  character: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
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

describe('PUT /api/characters/[id]', () => {
  it('rejects an invalid visibility value', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'char-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/characters/char-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PUBLIC' }),
    })
    const response = await PUT(request, { params: { id: 'char-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.character.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'char-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/characters/char-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Neuer Name' }),
    })
    const response = await PUT(request, { params: { id: 'char-1' } })
    expect(response.status).toBe(403)
  })

  it('rejects an invalid role value', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'char-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/characters/char-1', {
      method: 'PUT',
      body: JSON.stringify({ role: 'SIDEKICK' }),
    })
    const response = await PUT(request, { params: { id: 'char-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.character.update).not.toHaveBeenCalled()
  })

  it('updates the role when valid', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'char-1', authorId: 'user-1' })
    mockedPrisma.character.update.mockResolvedValue({ id: 'char-1', role: 'MENTOR' })

    const request = authedRequest('http://localhost/api/characters/char-1', {
      method: 'PUT',
      body: JSON.stringify({ role: 'MENTOR' }),
    })
    const response = await PUT(request, { params: { id: 'char-1' } })
    expect(response.status).toBe(200)
    expect(mockedPrisma.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'MENTOR' }) })
    )
  })
})

describe('DELETE /api/characters/[id]', () => {
  it('deletes relations referencing the character before deleting it (Z5 cascade)', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'char-1', authorId: 'user-1' })
    mockedPrisma.relation.deleteMany.mockResolvedValue({ count: 1 })
    mockedPrisma.character.delete.mockResolvedValue({ id: 'char-1' })

    const request = authedRequest('http://localhost/api/characters/char-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'char-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.relation.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ sourceType: 'CHARACTER', sourceId: 'char-1' }, { targetType: 'CHARACTER', targetId: 'char-1' }] },
    })
    expect(mockedPrisma.character.delete).toHaveBeenCalledWith({ where: { id: 'char-1' } })
  })

  it('returns 403 without touching relations when the caller is not the author', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce({ id: 'char-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/characters/char-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'char-1' } })

    expect(response.status).toBe(403)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
    expect(mockedPrisma.character.delete).not.toHaveBeenCalled()
  })

  it('returns 404 without touching relations when the character does not exist', async () => {
    mockedPrisma.character.findFirst.mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/characters/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
  })
})
