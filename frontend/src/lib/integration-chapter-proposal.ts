import { proposalToChapterHtml } from './integration-proposal-html'

export type ChapterProposalState = 'PENDING' | 'APPLIED' | 'REJECTED' | 'EXPIRED'

/** A proposal is untrusted content, never proof of the user's consent. */
export function validateChapterProposal(input: unknown):
  | { ok: true; value: { projectId: string; chapterId: string; expectedUpdatedAt: string; title: string; content: { type: 'doc'; content: unknown[] } } }
  | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Invalid proposal' }
  const data = input as Record<string, unknown>
  if (typeof data.projectId !== 'string' || !data.projectId || data.projectId.length > 128 ||
      typeof data.chapterId !== 'string' || !data.chapterId || data.chapterId.length > 128) {
    return { ok: false, error: 'Invalid identifiers' }
  }
  if (typeof data.expectedUpdatedAt !== 'string' ||
      !Number.isFinite(Date.parse(data.expectedUpdatedAt)) ||
      new Date(data.expectedUpdatedAt).toISOString() !== data.expectedUpdatedAt) {
    return { ok: false, error: 'Invalid revision' }
  }
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 300) {
    return { ok: false, error: 'Invalid title' }
  }
  const content = data.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return { ok: false, error: 'Invalid content' }
  const document = content as Record<string, unknown>
  if (document.type !== 'doc' || !Array.isArray(document.content)) return { ok: false, error: 'Invalid document' }
  if (JSON.stringify(content).length > 500_000) return { ok: false, error: 'Document too large' }
  if (proposalToChapterHtml(content) === null) return { ok: false, error: 'Unsupported proposal formatting' }
  return {
    ok: true,
    value: {
      projectId: data.projectId,
      chapterId: data.chapterId,
      expectedUpdatedAt: data.expectedUpdatedAt,
      title: data.title.trim(),
      content: { type: 'doc', content: document.content },
    },
  }
}

export function canApplyChapterProposal(
  state: ChapterProposalState,
  expiresAt: Date,
  currentRevision: Date,
  expectedRevision: Date,
  now: Date = new Date(),
): boolean {
  return state === 'PENDING' &&
    expiresAt.getTime() > now.getTime() &&
    currentRevision.getTime() === expectedRevision.getTime()
}
