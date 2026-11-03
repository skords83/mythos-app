import { locateEvidence, QuoteAnchor } from './evidence-anchor'

export const chapterEvidenceSelection = {
  id: true, quote: true, prefix: true, suffix: true, commentId: true, sourceHash: true, flagged: true,
} as const

/** Preserve resolvable quote/context anchors as well as inline comment marks.
 * Existing stale/missing evidence is not silently repaired or deleted. */
export function assertChapterEvidencePreserved(before: unknown, after: unknown, anchors: (QuoteAnchor & { id: string })[] = []) {
  for (const anchor of anchors) {
    if (locateEvidence(before, anchor).matchCount !== 1) continue
    const next = locateEvidence(after, anchor)
    if (next.matchCount !== 1) throw new Error(`Protected evidence anchor conflict at ${anchor.id}: the quoted passage or its context would become ${next.status.toLowerCase()}; preserve it or review the source evidence in Mythos`)
  }
}
