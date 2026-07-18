/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scene: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    relation: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  scene: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
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

describe('PUT /api/scenes/[id]', () => {
  it('rejects an invalid visibility value', async () => {
    mockedPrisma.scene.findFirst.mockResolvedValueOnce({ id: 'scene-1', authorId: 'user-1' })

    const request = authedRequest('http://localhost/api/scenes/scene-1', {
      method: 'PUT',
      body: JSON.stringify({ visibility: 'PUBLIC' }),
    })
    const response = await PUT(request, { params: { id: 'scene-1' } })
    expect(response.status).toBe(400)
    expect(mockedPrisma.scene.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.scene.findFirst.mockResolvedValueOnce({ id: 'scene-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/scenes/scene-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Neuer Name' }),
    })
    const response = await PUT(request, { params: { id: 'scene-1' } })
    expect(response.status).toBe(403)
  })

  it('updates order along with the other fields', async () => {
    mockedPrisma.scene.findFirst.mockResolvedValueOnce({ id: 'scene-1', authorId: 'user-1' })
    mockedPrisma.scene.update.mockResolvedValue({ id: 'scene-1', order: 3 })

    const request = authedRequest('http://localhost/api/scenes/scene-1', {
      method: 'PUT',
      body: JSON.stringify({ order: 3 }),
    })
    const response = await PUT(request, { params: { id: 'scene-1' } })
    expect(response.status).toBe(200)
    expect(mockedPrisma.scene.update).toHaveBeenCalledWith({
      where: { id: 'scene-1' },
      data: { order: 3 },
    })
  })
})

describe('DELETE /api/scenes/[id]', () => {
  it('deletes relations referencing the scene before deleting it (Z5 cascade)', async () => {
    mockedPrisma.scene.findFirst.mockResolvedValueOnce({ id: 'scene-1', authorId: 'user-1' })
    mockedPrisma.relation.deleteMany.mockResolvedValue({ count: 1 })
    mockedPrisma.scene.delete.mockResolvedValue({ id: 'scene-1' })

    const request = authedRequest('http://localhost/api/scenes/scene-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'scene-1' } })

    expect(response.status).toBe(200)
    expect(mockedPrisma.relation.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ sourceType: 'SCENE', sourceId: 'scene-1' }, { targetType: 'SCENE', targetId: 'scene-1' }] },
    })
    expect(mockedPrisma.scene.delete).toHaveBeenCalledWith({ where: { id: 'scene-1' } })
  })

  it('returns 403 without touching relations when the caller is not the author', async () => {
    mockedPrisma.scene.findFirst.mockResolvedValueOnce({ id: 'scene-1', authorId: 'other-user' })

    const request = authedRequest('http://localhost/api/scenes/scene-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'scene-1' } })

    expect(response.status).toBe(403)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
    expect(mockedPrisma.scene.delete).not.toHaveBeenCalled()
  })

  it('returns 404 without touching relations when the scene does not exist', async () => {
    mockedPrisma.scene.findFirst.mockResolvedValueOnce(null)

    const request = authedRequest('http://localhost/api/scenes/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
    expect(mockedPrisma.relation.deleteMany).not.toHaveBeenCalled()
  })
})
