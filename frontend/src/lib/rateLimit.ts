import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

let client: Redis | null = null

function getClient(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
    client.on('error', (err) => console.error('Redis error:', err))
  }
  return client
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

// Atomic fixed-window rate limiter backed by Redis, shared across all
// app replicas. INCR + EXPIRE run as a single Lua script so a crash or
// race between the two commands can't leave a key without a TTL.
const INCR_WITH_TTL_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { count, ttl }
`

export async function checkRateLimit(
  identifier: string,
  scope: string,
  { limit, windowMs }: RateLimitOptions
): Promise<NextResponse | null> {
  const key = `ratelimit:${scope}:${identifier}`

  let count: number
  let ttl: number
  try {
    const result = (await getClient().eval(
      INCR_WITH_TTL_SCRIPT,
      1,
      key,
      windowMs
    )) as [number, number]
    ;[count, ttl] = result
  } catch (err) {
    // Fail open: if Redis is unreachable, don't block legitimate traffic.
    console.error('Rate limit check failed, allowing request:', err)
    return null
  }

  if (count > limit) {
    const retryAfter = Math.ceil(ttl / 1000)
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  return null
}
