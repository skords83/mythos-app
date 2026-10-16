import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

/** Resolves a read-only bearer token to its actual Mythos user. */
export async function resolveReadOnlyUser(authorization: string | null): Promise<string | null> {
  if (!authorization?.startsWith('Bearer ')) return null
  const supplied = authorization.slice(7)
  if (!supplied || supplied.length > 512) return null

  // Backwards-compatible development credential. Disabled unless both vars exist.
  const configured = process.env.MYTHOS_INTEGRATION_READ_TOKEN
  const configuredUser = process.env.MYTHOS_INTEGRATION_USER_ID
  if (configured && configured.length >= 32 && configuredUser) {
    const a = createHash('sha256').update(supplied).digest()
    const b = createHash('sha256').update(configured).digest()
    if (timingSafeEqual(a, b)) return configuredUser
  }

  // OAuth credentials are database-backed, expiring and revocable.
  const tokenHash = createHash('sha256').update(supplied).digest('hex')
  const token = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash },
    select: { userId: true, scope: true, expiresAt: true, revokedAt: true },
  })
  if (!token || token.revokedAt || token.expiresAt <= new Date() ||
      !token.scope.split(' ').includes('mythos:read')) return null
  return token.userId
}
