/** @jest-environment node */
import { createHash } from 'crypto'
import { isValidPkceChallenge, isValidPkceVerifier, verifyPkceS256, isValidOAuthRedirectUri, matchesRegisteredRedirectUri } from './oauth-pkce'

const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'
const challenge = createHash('sha256').update(verifier, 'ascii').digest('base64url')

test('validates a standard PKCE S256 exchange', () => {
  expect(isValidPkceVerifier(verifier)).toBe(true)
  expect(isValidPkceChallenge(challenge)).toBe(true)
  expect(verifyPkceS256(challenge, verifier)).toBe(true)
})
test('rejects mismatched or malformed PKCE verifier', () => {
  expect(verifyPkceS256(challenge, verifier + 'x')).toBe(false)
  expect(verifyPkceS256(challenge, 'short')).toBe(false)
  expect(isValidPkceChallenge('not-a-valid-challenge')).toBe(false)
})
test('rejects insecure external redirect URIs', () => {
  expect(isValidOAuthRedirectUri('http://example.com/callback')).toBe(false)
  expect(isValidOAuthRedirectUri('https://example.com/callback#fragment')).toBe(false)
  expect(isValidOAuthRedirectUri('https://user:password@example.com/callback')).toBe(false)
  expect(isValidOAuthRedirectUri('https://example.com/callback')).toBe(true)
})
test('requires exact redirect URI registration', () => {
  const registered = ['https://client.example/callback']
  expect(matchesRegisteredRedirectUri('https://client.example/callback', registered)).toBe(true)
  expect(matchesRegisteredRedirectUri('https://client.example/callback?extra=1', registered)).toBe(false)
  expect(matchesRegisteredRedirectUri('https://client.example.evil.test/callback', registered)).toBe(false)
})
