/** @jest-environment node */
import {
  hasMythosScope, isConfirmedWrite, parseMythosScopes,
} from './integration-permissions'

test('read-only grants never imply write', () => {
  expect(hasMythosScope('mythos:read', 'mythos:read')).toBe(true)
  expect(hasMythosScope('mythos:read', 'mythos:write')).toBe(false)
})
test('write requires read for optimistic concurrency protection', () => {
  expect(parseMythosScopes('mythos:write')).toBeNull()
  expect(parseMythosScopes('mythos:read mythos:write')).toEqual(['mythos:read', 'mythos:write'])
})
test('unknown scopes including delete are rejected', () => {
  expect(parseMythosScopes('mythos:read mythos:delete')).toBeNull()
  expect(parseMythosScopes('mythos:admin')).toBeNull()
})
test('malformed scope sets are rejected', () => {
  expect(parseMythosScopes('mythos:read  mythos:write')).toBeNull()
  expect(parseMythosScopes('')).toBeNull()
})
test('write requires explicit true confirmation and a precise revision timestamp', () => {
  const expectedUpdatedAt = '2026-10-16T10:00:00.000Z'
  expect(isConfirmedWrite({ confirmed: true, expectedUpdatedAt })).toBe(true)
  expect(isConfirmedWrite({ confirmed: false, expectedUpdatedAt })).toBe(false)
  expect(isConfirmedWrite({ confirmed: true, expectedUpdatedAt: null })).toBe(false)
  expect(isConfirmedWrite({ confirmed: true, expectedUpdatedAt: 'yesterday' })).toBe(false)
})
