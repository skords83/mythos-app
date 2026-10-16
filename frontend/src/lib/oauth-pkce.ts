import { createHash, timingSafeEqual } from 'crypto'

/** RFC 7636 PKCE S256 helpers. No secrets or authorization codes are logged. */
export function isValidPkceChallenge(challenge: unknown): challenge is string {
  return typeof challenge === 'string' && /^[A-Za-z0-9_-]{43}$/.test(challenge)
}

export function isValidPkceVerifier(verifier: unknown): verifier is string {
  return typeof verifier === 'string' && verifier.length >= 43 && verifier.length <= 128 &&
    /^[A-Za-z0-9._~-]+$/.test(verifier)
}

export function verifyPkceS256(challenge: string, verifier: string): boolean {
  if (!isValidPkceChallenge(challenge) || !isValidPkceVerifier(verifier)) return false
  const computed = createHash('sha256').update(verifier, 'ascii').digest('base64url')
  return timingSafeEqual(Buffer.from(computed, 'ascii'), Buffer.from(challenge, 'ascii'))
}

/** Only allow secure redirect URIs; loopback HTTP is reserved for local testing. */
export function isValidOAuthRedirectUri(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    if (url.username || url.password || url.hash) return false
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === 'localhost')
  } catch {
    return false
  }
}

/** OAuth redirect URI comparisons must use exact registered strings, not host suffixes. */
export function matchesRegisteredRedirectUri(candidate: string, registered: string[]): boolean {
  return isValidOAuthRedirectUri(candidate) && registered.includes(candidate)
}
