/** Explicit OAuth capabilities. Write never implies delete. */
export const MYTHOS_READ_SCOPE = 'mythos:read'
export const MYTHOS_WRITE_SCOPE = 'mythos:write'
export type MythosScope = typeof MYTHOS_READ_SCOPE | typeof MYTHOS_WRITE_SCOPE

export function parseMythosScopes(raw: unknown): MythosScope[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const parts = raw.split(' ')
  if (parts.some((part) => !part || (part !== MYTHOS_READ_SCOPE && part !== MYTHOS_WRITE_SCOPE))) return null
  const unique = [...new Set(parts)] as MythosScope[]
  // Editing requires reading the current revision for conflict detection.
  if (unique.includes(MYTHOS_WRITE_SCOPE) && !unique.includes(MYTHOS_READ_SCOPE)) return null
  return unique.sort()
}

export function hasMythosScope(granted: string, required: MythosScope): boolean {
  const scopes = parseMythosScopes(granted)
  return scopes !== null && scopes.includes(required)
}

/** No write operation may proceed without an explicit per-operation approval. */
export function isConfirmedWrite(input: {
  confirmed: unknown
  expectedUpdatedAt: unknown
}): input is { confirmed: true; expectedUpdatedAt: string } {
  return input.confirmed === true &&
    typeof input.expectedUpdatedAt === 'string' &&
    !Number.isNaN(Date.parse(input.expectedUpdatedAt)) &&
    new Date(input.expectedUpdatedAt).toISOString() === input.expectedUpdatedAt
}
