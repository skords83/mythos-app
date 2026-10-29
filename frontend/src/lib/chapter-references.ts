import { parseFragment, type DefaultTreeAdapterMap } from 'parse5'

export type ReferenceKind = 'CHARACTER' | 'PLACE' | 'ITEM' | 'COMMENT' | 'UNKNOWN'
export type ChapterReference = { key: string; kind: ReferenceKind; targetId: string; label: string }
type JsonNode = { type?: string; text?: string; attrs?: Record<string, unknown>; content?: JsonNode[]; marks?: JsonNode[] }
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Edits one anchor only. HTML text and surrounding source are never reserialized. */
export function chapterReferences(original: unknown, change?: { key: string; targetId: string | null; resolved?: boolean }) {
  const references: ChapterReference[] = []
  let changed = false
  function htmlReferences(html: string) {
    const edits: { start: number; end: number; text: string }[] = []
    type HtmlNode = DefaultTreeAdapterMap['node']
    const text = (n: HtmlNode): string => 'value' in n ? n.value : 'childNodes' in n ? n.childNodes.map(text).join('') : ''
    const visit = (n: HtmlNode) => {
      if ('tagName' in n) {
        const attrs = Object.fromEntries(n.attrs.map(a => [a.name, a.value]))
        const kinds: ReferenceKind[] = []
        if ('data-comment-id' in attrs) kinds.push('COMMENT')
        if ('data-character-mention' in attrs) kinds.push('CHARACTER')
        if ('data-entity-mention' in attrs) kinds.push(attrs['data-entity-kind'] === 'PLACE' ? 'PLACE' : attrs['data-entity-kind'] === 'ITEM' ? 'ITEM' : 'UNKNOWN')
        const loc = n.sourceCodeLocation
        kinds.forEach((kind, index) => {
          if (loc?.startTag) {
            const idAttr = kind === 'COMMENT' ? 'data-comment-id' : kind === 'CHARACTER' ? 'data-character-id' : 'data-entity-id'
            const key = index === 0 ? String(loc.startOffset) : `${loc.startOffset}:${kind}`
            references.push({ key, kind: kind as ReferenceKind, targetId: attrs[idAttr] ?? '', label: text(n) })
            if (change?.key === key) {
              changed = true
              if (change.targetId === null) {
                const removable = kind === 'COMMENT' ? ['data-comment-id', 'data-comment-resolved'] : kind === 'CHARACTER' ? ['data-character-mention', 'data-character-id'] : ['data-entity-mention', 'data-entity-id', 'data-entity-kind']
                for (const name of removable) {
                  const range = loc.attrs?.[name]
                  if (range) edits.push({ start: range.startOffset, end: range.endOffset, text: '' })
                }
              } else {
                const range = loc.attrs?.[idAttr]
                if (range) edits.push({ start: range.startOffset, end: range.endOffset, text: `${idAttr}="${escapeAttr(change.targetId)}"` })
                else {
                  const at = loc.startTag.endOffset - (html.slice(loc.startTag.startOffset, loc.startTag.endOffset).endsWith('/>') ? 2 : 1)
                  edits.push({ start: at, end: at, text: ` ${idAttr}="${escapeAttr(change.targetId)}"` })
                }
                if (kind === 'COMMENT' && change.resolved !== undefined) {
                  const resolvedRange = loc.attrs?.['data-comment-resolved']
                  const attribute = `data-comment-resolved="${change.resolved}"`
                  if (resolvedRange) edits.push({ start: resolvedRange.startOffset, end: resolvedRange.endOffset, text: attribute })
                  else {
                    const at = loc.startTag.endOffset - (html.slice(loc.startTag.startOffset, loc.startTag.endOffset).endsWith('/>') ? 2 : 1)
                    edits.push({ start: at, end: at, text: ' ' + attribute })
                  }
                }
              }
            }
          }
        })
      }
      if ('childNodes' in n) n.childNodes.forEach(visit)
    }
    visit(parseFragment(html, { sourceCodeLocationInfo: true }))
    for (const edit of edits.sort((a, b) => b.start - a.start)) html = html.slice(0, edit.start) + edit.text + html.slice(edit.end)
    return html
  }
  function jsonReferences(node: JsonNode, path: string): JsonNode {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return node
    const kind = node.type === 'characterMention' ? 'CHARACTER' : node.type === 'entityMention' ? (node.attrs?.kind === 'PLACE' ? 'PLACE' : node.attrs?.kind === 'ITEM' ? 'ITEM' : 'UNKNOWN') : node.type === 'comment' && /\.marks\.\d+$/.test(path) ? 'COMMENT' : null
    let result = { ...node }
    if (kind && ['CHARACTER', 'PLACE', 'ITEM', 'COMMENT', 'UNKNOWN'].includes(String(kind))) {
      const idAttr = kind === 'COMMENT' ? 'commentId' : kind === 'CHARACTER' ? 'characterId' : 'entityId'
      references.push({ key: path, kind: kind as ReferenceKind, targetId: String(node.attrs?.[idAttr] ?? ''), label: kind === 'COMMENT' ? 'Kommentar' : `@${node.attrs?.label ?? ''}` })
      if (change?.key === path) {
        changed = true
        if (change.targetId === null) return kind === 'COMMENT' ? node : { type: 'text', text: `@${node.attrs?.label ?? ''}`, ...(node.marks ? { marks: node.marks } : {}) }
        result.attrs = { ...node.attrs, [idAttr]: change.targetId, ...(kind === 'COMMENT' && change.resolved !== undefined ? { resolved: change.resolved } : {}) }
      }
    }
    if (Array.isArray(node.content)) result.content = node.content.map((n, i) => jsonReferences(n, `${path}.content.${i}`))
    if (Array.isArray(node.marks)) result.marks = node.marks.map((n, i) => jsonReferences(n, `${path}.marks.${i}`)).filter((_n, i) => !(change?.targetId === null && change.key === `${path}.marks.${i}` && node.marks?.[i]?.type === 'comment'))
    return result
  }
  let content = original
  if (typeof original === 'string') content = htmlReferences(original)
  else if (original && typeof original === 'object' && !Array.isArray(original)) {
    const value = original as Record<string, unknown>
    if (typeof value.content === 'string') content = { ...value, content: htmlReferences(value.content) }
    else content = jsonReferences(original as JsonNode, 'doc')
  }
  return { references, content, changed }
}
