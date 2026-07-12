/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  signAuthToken,
  verifyAuthToken,
  getUserFromRequest,
  getAuthContext,
  requireRole,
  setAuthCookie,
  clearAuthCookie,
} from '../auth'

describe('auth token helpers', () => {
  const originalSecret = process.env.JWT_SECRET

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret
  })

  it('signs and verifies a round-trip token', () => {
    const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    const payload = verifyAuthToken(token)
    expect(payload.userId).toBe('user-1')
    expect(payload.familyId).toBe('fam-1')
    expect(payload.role).toBe('ADULT')
  })

  it('throws when verifying a tampered token', () => {
    const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    expect(() => verifyAuthToken(token + 'tampered')).toThrow()
  })

  it('throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET
    expect(() =>
      signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    ).toThrow('JWT_SECRET environment variable is not set')
    process.env.JWT_SECRET = 'test-secret'
  })
})

describe('getUserFromRequest', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  it('returns null when there is no auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/test')
    expect(await getUserFromRequest(request)).toBeNull()
  })

  it('returns null when the cookie holds an invalid token', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: 'auth-token=not-a-real-token' },
    })
    expect(await getUserFromRequest(request)).toBeNull()
  })

  it('returns the userId when the cookie holds a valid token', async () => {
    const token = signAuthToken({ userId: 'user-42', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${token}` },
    })
    expect(await getUserFromRequest(request)).toBe('user-42')
  })
})

describe('getAuthContext', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  it('returns null when there is no auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/test')
    expect(await getAuthContext(request)).toBeNull()
  })

  it('returns null when the cookie holds an invalid token', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: 'auth-token=not-a-real-token' },
    })
    expect(await getAuthContext(request)).toBeNull()
  })

  it('returns userId/familyId/role when the token is valid and complete', async () => {
    const token = signAuthToken({ userId: 'user-42', email: 'a@example.com', familyId: 'fam-7', role: 'CHILD' })
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${token}` },
    })
    expect(await getAuthContext(request)).toEqual({ userId: 'user-42', familyId: 'fam-7', role: 'CHILD' })
  })

  it('returns null for a legacy token that is missing familyId/role', async () => {
    const legacyToken = require('jsonwebtoken').sign({ userId: 'user-1', email: 'a@example.com' }, 'test-secret')
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${legacyToken}` },
    })
    expect(await getAuthContext(request)).toBeNull()
  })
})

describe('requireRole', () => {
  it('returns null (no response) when the role is allowed', () => {
    const context = { userId: 'user-1', familyId: 'fam-1', role: 'OWNER' as const }
    expect(requireRole(context, ['OWNER', 'ADULT'])).toBeNull()
  })

  it('returns a 403 NextResponse when the role is not allowed', async () => {
    const context = { userId: 'user-1', familyId: 'fam-1', role: 'CHILD' as const }
    const result = requireRole(context, ['OWNER'])
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
    const body = await result?.json()
    expect(body.error).toBe('Keine Berechtigung')
  })
})

describe('auth cookie helpers', () => {
  it('sets an httpOnly auth-token cookie', () => {
    const response = NextResponse.json({ ok: true })
    setAuthCookie(response, 'a-token')
    const cookie = response.cookies.get('auth-token')
    expect(cookie?.value).toBe('a-token')
    expect(cookie?.httpOnly).toBe(true)
  })

  it('clears the auth-token cookie', () => {
    const response = NextResponse.json({ ok: true })
    clearAuthCookie(response)
    const cookie = response.cookies.get('auth-token')
    expect(cookie?.value).toBe('')
    expect(cookie?.maxAge).toBe(0)
  })
})
