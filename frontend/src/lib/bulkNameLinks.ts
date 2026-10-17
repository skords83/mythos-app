import { parseFragment, type DefaultTreeAdapterMap } from 'parse5'
import { candidateKey, recognizeNames, type NameCandidate } from './nameRecognition'

type HtmlNode = DefaultTreeAdapterMap['node']
export interface NameGroup { key: string; name: string; kind: string; count: number }
export interface AmbiguousName { text: string; candidates: string[]; count: number }
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Modify only matching text nodes, keeping all surrounding source HTML verbatim.
// In particular, never round-trip whole chapters through the editor's schema.
export function bulkNameLinks(html: string, candidates: NameCandidate[], kinds: string[], selected?: string[]) {
  const groups = new Map<string, NameGroup>()
  const ambiguous = new Map<string, AmbiguousName>()
  const edits: { start: number; end: number; html: string }[] = []
  let added = 0
  let skipped = 0
  const visit = (node: HtmlNode) => {
    if ('tagName' in node && (['script', 'style', 'textarea'].includes(node.tagName) || node.attrs.some(a => ['data-character-mention', 'data-entity-mention'].includes(a.name)))) return
    if (node.nodeName === '#text' && 'value' in node && node.sourceCodeLocation) {
      const matches = recognizeNames(node.value, candidates)
      let result = '', offset = 0, changed = false
      for (const match of matches) {
        if (!match.candidates.some(c => kinds.includes(c.kind))) continue
        const text = node.value.slice(match.from, match.to)
        if (match.candidates.length !== 1) {
          const names = match.candidates.map(c => `${c.kind === 'CHARACTER' ? 'Figur' : c.kind === 'PLACE' ? 'Ort' : 'Objekt'}: ${c.label ?? c.name}`)
          const key = JSON.stringify([text, names])
          const group = ambiguous.get(key) ?? { text, candidates: names, count: 0 }
          group.count++; ambiguous.set(key, group); skipped++; continue
        }
        const c = match.candidates[0], key = candidateKey(c)
        const group = groups.get(key) ?? { key, name: c.label ?? c.name, kind: c.kind, count: 0 }
        group.count++; groups.set(key, group)
        if (selected && !selected.includes(key)) { skipped++; continue }
        result += escape(node.value.slice(offset, match.from))
        const attributes = c.kind === 'CHARACTER'
          ? `data-character-mention="" data-character-id="${escape(c.id)}"`
          : `data-entity-mention="" data-entity-kind="${c.kind}" data-entity-id="${escape(c.id)}"`
        result += `<span ${attributes} data-label="${escape(text)}">@${escape(text)}</span>`
        offset = match.to; added++; changed = true
      }
      if (changed) {
        result += escape(node.value.slice(offset))
        edits.push({ start: node.sourceCodeLocation.startOffset, end: node.sourceCodeLocation.endOffset, html: result })
      }
    }
    if ('childNodes' in node) node.childNodes.forEach(visit)
  }
  visit(parseFragment(html, { sourceCodeLocationInfo: true }))
  let content = html
  for (const edit of edits.sort((a, b) => b.start - a.start)) content = content.slice(0, edit.start) + edit.html + content.slice(edit.end)
  return { content, groups: [...groups.values()], ambiguous: [...ambiguous.values()], added, skipped }
}

export function chapterHtml(content: unknown): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object' && 'content' in content && typeof content.content === 'string') return content.content
  throw new Error('Nicht unterstütztes Kapitelformat')
}
export function replaceChapterHtml(original: unknown, html: string) {
  return original && typeof original === 'object' ? { ...original, content: html } : html
}
