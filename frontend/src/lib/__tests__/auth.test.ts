/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  signAuthToken,
  verifyAuthToken,
  getUserFromRequest,
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
    const token = signAuthToken({ userId: 'user-1', email: 'a@example.com' })
    const payload = verifyAuthToken(token)
    expect(payload.userId).toBe('user-1')
    expect(payload.email).toBe('a@example.com')
  })

  it('throws when verifying a tampered token', () => {
    const token = signAuthToken({ userId: 'user-1', email: 'a@example.com' })
    expect(() => verifyAuthToken(token + 'tampered')).toThrow()
  })

  it('throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET
    expect(() => signAuthToken({ userId: 'user-1', email: 'a@example.com' })).toThrow(
      'JWT_SECRET environment variable is not set'
    )
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
    const token = signAuthToken({ userId: 'user-42', email: 'a@example.com' })
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${token}` },
    })
    expect(await getUserFromRequest(request)).toBe('user-42')
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
