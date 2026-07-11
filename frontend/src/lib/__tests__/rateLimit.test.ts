/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '../rateLimit'

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', { headers })
}

describe('getClientIp', () => {
  it('reads the first address from x-forwarded-for', () => {
    const request = makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(request)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const request = makeRequest({ 'x-real-ip': '9.9.9.9' })
    expect(getClientIp(request)).toBe('9.9.9.9')
  })

  it('falls back to "unknown" when no IP headers are present', () => {
    const request = makeRequest()
    expect(getClientIp(request)).toBe('unknown')
  })
})

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const result = checkRateLimit('user-a', 'test-scope-1', { limit: 3, windowMs: 60_000 })
    expect(result).toBeNull()
  })

  it('blocks requests once the limit is reached, with a 429 and Retry-After header', async () => {
    const options = { limit: 2, windowMs: 60_000 }
    expect(checkRateLimit('user-b', 'test-scope-2', options)).toBeNull()
    expect(checkRateLimit('user-b', 'test-scope-2', options)).toBeNull()

    const blocked = checkRateLimit('user-b', 'test-scope-2', options)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('Retry-After')).toBeTruthy()

    const body = await blocked!.json()
    expect(body.error).toMatch(/Anfragen/)
  })

  it('tracks separate identifiers independently', () => {
    const options = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit('user-c', 'test-scope-3', options)).toBeNull()
    expect(checkRateLimit('user-c', 'test-scope-3', options)).not.toBeNull()
    // Different identifier, same scope, should still be allowed.
    expect(checkRateLimit('user-d', 'test-scope-3', options)).toBeNull()
  })

  it('resets the count after the window elapses', () => {
    const options = { limit: 1, windowMs: 10 }
    expect(checkRateLimit('user-e', 'test-scope-4', options)).toBeNull()
    expect(checkRateLimit('user-e', 'test-scope-4', options)).not.toBeNull()

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit('user-e', 'test-scope-4', options)).toBeNull()
        resolve()
      }, 20)
    })
  })
})
