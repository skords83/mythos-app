import { isConfirmedWrite } from './integration-permissions'

/**
 * Prepare a chapter replacement without modifying storage.
 * The caller must separately verify OAuth write scope and chapter ownership.
 */
export function validateChapterReplacement(input: unknown):
  | { ok: true; value: { confirmed: true; expectedUpdatedAt: string; title: string; content: { type: 'doc'; content: unknown[] } } }
  | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Invalid payload' }
  const value = input as Record<string, unknown>
  if (!isConfirmedWrite({ confirmed: value.confirmed, expectedUpdatedAt: value.expectedUpdatedAt })) {
    return { ok: false, error: 'Explicit confirmation and current revision required' }
  }
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 300) {
    return { ok: false, error: 'Invalid chapter title' }
  }
  const content = value.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return { ok: false, error: 'Invalid document' }
  const document = content as Record<string, unknown>
  if (document.type !== 'doc' || !Array.isArray(document.content)) return { ok: false, error: 'Tiptap document required' }
  if (JSON.stringify(content).length > 500_000) return { ok: false, error: 'Document too large' }
  return {
    ok: true,
    value: {
      confirmed: true,
      expectedUpdatedAt: value.expectedUpdatedAt as string,
      title: value.title.trim(),
      content: { type: 'doc', content: document.content },
    },
  }
}

export function chapterRevisionMatches(currentUpdatedAt: Date, expectedUpdatedAt: string): boolean {
  return currentUpdatedAt.toISOString() === expectedUpdatedAt
}
