import { isTextEdits, validTextEdits, TextEdits } from './chapter-text-edits'
import { proposalToChapterHtml } from './integration-proposal-html'

export type ChapterProposalState = 'PENDING' | 'APPLIED' | 'REJECTED' | 'EXPIRED'

/** A proposal is untrusted content, never proof of the user's consent. */
export function validateChapterProposal(input: unknown):
  | { ok: true; value: { projectId: string; chapterId: string; expectedUpdatedAt: string; title: string; content: { type: 'doc'; content: unknown[] } | TextEdits } }
  | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Proposal must be an object with projectId, chapterId, expectedUpdatedAt, title and content' }
  const data = input as Record<string, unknown>
  if (typeof data.projectId !== 'string' || !data.projectId || data.projectId.length > 128 ||
      typeof data.chapterId !== 'string' || !data.chapterId || data.chapterId.length > 128) {
    return { ok: false, error: 'projectId and chapterId must be nonempty strings of at most 128 characters' }
  }
  if (typeof data.expectedUpdatedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(data.expectedUpdatedAt) ||
      !Number.isFinite(Date.parse(data.expectedUpdatedAt))) {
    return { ok: false, error: 'Invalid expectedUpdatedAt: use the ISO date-time revision returned by mythos_chapter' }
  }
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 300) {
    return { ok: false, error: 'title must contain text and be at most 300 characters' }
  }
  const content = data.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return { ok: false, error: 'Invalid content: use chapterTextEdits with edits, or a supported Tiptap doc; HTML strings are not accepted' }
  const document = content as Record<string, unknown>
  if (isTextEdits(content)) {
    if (!validTextEdits(content) || JSON.stringify({ type: content.type, edits: content.edits }).length > 500_000) return { ok: false, error: 'Invalid text edits: supply 1–1000 unique nodeId/before/after entries with string after text (empty deletes) (maximum 500000 characters)' }
    return { ok: true, value: { projectId: data.projectId, chapterId: data.chapterId, expectedUpdatedAt: new Date(data.expectedUpdatedAt).toISOString(), title: data.title.trim(), content } }
  }
  if (document.type !== 'doc' || !Array.isArray(document.content)) return { ok: false, error: 'content must be a Tiptap doc with a content array, or chapterTextEdits with an edits array' }
  if (JSON.stringify(content).length > 500_000) return { ok: false, error: 'Document too large' }
  if (proposalToChapterHtml(content) === null) return { ok: false, error: 'Unsupported proposal formatting: replacement supports paragraphs, headings 1–2, lists, blockquotes, bold/italic/strike/code and hardBreak only; use chapterTextEdits to preserve existing formatting and anchors' }
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
