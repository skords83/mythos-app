import { createHash } from 'crypto'
import { sourceText } from './evidence-text'
export { sourceText } from './evidence-text'
export const sourceHash = (content: unknown) => createHash('sha256').update(JSON.stringify(content ?? null)).digest('hex')
export type QuoteAnchor = { quote: string; prefix: string; suffix: string; commentId: string | null; sourceHash: string; flagged: boolean }
export function locateEvidence(content: unknown, anchor: QuoteAnchor) {
  const full = sourceText(content, anchor.commentId)
  const quote = anchor.quote.replace(/\s+/g, ' ').trim()
  const prefix = anchor.prefix.replace(/\s+/g, ' ')
  const suffix = anchor.suffix.replace(/\s+/g, ' ')
  const matches: number[] = []
  if (quote) for (let i = full.indexOf(quote); i !== -1; i = full.indexOf(quote, i + 1)) {
    if (full.slice(0, i).endsWith(prefix) && full.slice(i + quote.length).startsWith(suffix)) matches.push(i)
  }
  const status = matches.length === 0 ? 'MISSING' : matches.length > 1 ? 'AMBIGUOUS' : anchor.flagged || sourceHash(content) !== anchor.sourceHash ? 'STALE' : 'VALID'
  return { status, matchCount: matches.length, excerpt: matches.length === 1 ? full.slice(Math.max(0, matches[0] - 100), matches[0] + quote.length + 100) : null }
}
