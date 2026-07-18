/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    timelineEvent: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    relation: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  timelineEvent: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock }
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

describe('PUT /api/timeline-events/[id]', () => {
  it('returns 404 when the event does not exist in the caller family', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue(null)
    const response = await PUT(
      authedRequest('http://localhost/api/timeline-events/e1', { method: 'PUT', body: JSON.stringify({ title: 'x' }) }),
      { params: { id: 'e1' } }
    )
    expect(response.status).toBe(404)
  })

  it('returns 403 when the caller is not the author', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'someone-else' })
    const response = await PUT(
      authedRequest('http://localhost/api/timeline-events/e1', { method: 'PUT', body: JSON.stringify({ title: 'x' }) }),
      { params: { id: 'e1' } }
    )
    expect(response.status).toBe(403)
  })

  it('updates the event when the caller is the author', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'user-1' })
    mockedPrisma.timelineEvent.update.mockResolvedValue({ id: 'e1', title: 'Neuer Titel' })
    const response = await PUT(
      authedRequest('http://localhost/api/timeline-events/e1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Neuer Titel', type: 'LORE' }),
      }),
      { params: { id: 'e1' } }
    )
    expect(response.status).toBe(200)
    expect(mockedPrisma.timelineEvent.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { title: 'Neuer Titel', type: 'LORE' },
    })
  })

  it('rejects an invalid visibility value', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'user-1' })
    const response = await PUT(
      authedRequest('http://localhost/api/timeline-events/e1', {
        method: 'PUT',
        body: JSON.stringify({ visibility: 'PUBLIC' }),
      }),
      { params: { id: 'e1' } }
    )
    expect(response.status).toBe(400)
  })

  it('rejects an invalid type value', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'user-1' })
    const response = await PUT(
      authedRequest('http://localhost/api/timeline-events/e1', {
        method: 'PUT',
        body: JSON.stringify({ type: 'MYTH' }),
      }),
      { params: { id: 'e1' } }
    )
    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/timeline-events/[id]', () => {
  it('returns 403 when the caller is neither author nor OWNER', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'someone-else' })
    const response = await DELETE(authedRequest('http://localhost/api/timeline-events/e1', { method: 'DELETE' }), {
      params: { id: 'e1' },
    })
    expect(response.status).toBe(403)
  })

  it('allows a family OWNER to delete an event authored by someone else', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'someone-else' })
    mockedPrisma.timelineEvent.delete.mockResolvedValue({ id: 'e1' })
    const response = await DELETE(
      authedRequest('http://localhost/api/timeline-events/e1', { method: 'DELETE' }, 'OWNER'),
      { params: { id: 'e1' } }
    )
    expect(response.status).toBe(200)
    expect(mockedPrisma.timelineEvent.delete).toHaveBeenCalledWith({ where: { id: 'e1' } })
  })

  it('cleans up dangling Relation rows for the event before deleting it', async () => {
    mockedPrisma.timelineEvent.findFirst.mockResolvedValue({ id: 'e1', authorId: 'user-1' })
    mockedPrisma.timelineEvent.delete.mockResolvedValue({ id: 'e1' })
    await DELETE(authedRequest('http://localhost/api/timeline-events/e1', { method: 'DELETE' }), { params: { id: 'e1' } })
    expect(mockedPrisma.relation.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { sourceType: 'EVENT', sourceId: 'e1' },
          { targetType: 'EVENT', targetId: 'e1' },
        ],
      },
    })
  })
})
