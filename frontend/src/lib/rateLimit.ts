import { NextRequest, NextResponse } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Periodically drop expired buckets so the map doesn't grow unbounded
// for the lifetime of the server process.
let lastSweep = Date.now()
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) buckets.delete(key)
  })
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

// In-memory fixed-window rate limiter. Fine for a single-instance deploy;
// swap for a shared store (e.g. Redis) before scaling to multiple replicas.
export function checkRateLimit(
  identifier: string,
  scope: string,
  { limit, windowMs }: RateLimitOptions
): NextResponse | null {
  const now = Date.now()
  sweep(now)

  const key = `${scope}:${identifier}`
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  bucket.count += 1
  return null
}
