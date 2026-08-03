/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  userSettings: { findUnique: jest.Mock; upsert: jest.Mock }
}

function authedRequest(url: string, init: Omit<RequestInit, 'signal'> = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/settings', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/settings'))
    expect(response.status).toBe(401)
  })

  it('returns defaults when no row exists yet', async () => {
    mockedPrisma.userSettings.findUnique.mockResolvedValue(null)
    const response = await GET(authedRequest('http://localhost/api/settings'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ focusModeEnabled: false, spellcheckEnabled: true, spellcheckLocale: null })
  })

  it('scopes the lookup to the authenticated user', async () => {
    mockedPrisma.userSettings.findUnique.mockResolvedValue({
      focusModeEnabled: true, spellcheckEnabled: false, spellcheckLocale: 'de-DE',
    })
    const response = await GET(authedRequest('http://localhost/api/settings'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })
})

describe('PUT /api/settings', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await PUT(new NextRequest('http://localhost/api/settings', { method: 'PUT', body: '{}' }))
    expect(response.status).toBe(401)
  })

  it('rejects a non-boolean spellcheckEnabled', async () => {
    const response = await PUT(authedRequest('http://localhost/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ spellcheckEnabled: 'yes' }),
    }))
    expect(response.status).toBe(400)
  })

  it('upserts only the provided fields, scoped to the caller', async () => {
    mockedPrisma.userSettings.upsert.mockResolvedValue({
      focusModeEnabled: false, spellcheckEnabled: false, spellcheckLocale: null,
    })
    const response = await PUT(authedRequest('http://localhost/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ spellcheckEnabled: false }),
    }))
    expect(response.status).toBe(200)
    expect(mockedPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', spellcheckEnabled: false },
      update: { spellcheckEnabled: false },
    })
  })
})
