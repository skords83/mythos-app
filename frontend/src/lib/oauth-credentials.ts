import { createHash, randomBytes } from 'crypto'

export function issueOpaqueCredential(): { value: string; hash: string } {
  const value = randomBytes(32).toString('base64url')
  return { value, hash: hashCredential(value) }
}

export function hashCredential(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}
