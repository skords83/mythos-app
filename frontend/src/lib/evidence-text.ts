import { parseFragment } from 'parse5'

// Text-quote + surrounding context survives insertions before the passage.
// Existing comment marks are stable editor IDs; no offsets are persisted.
export function sourceText(content: unknown, commentId?: string | null): string {
  const visit = (value: any, anchored = false): string => {
    if (typeof value === 'string') {
      try { return visit(JSON.parse(value), anchored) } catch { /* HTML storage */ }
      const walk = (node: any, inside: boolean): string => {
        const active = inside || node.attrs?.some((a: any) => a.name === 'data-comment-id' && a.value === commentId)
        if (node.nodeName === '#text') return !commentId || active ? node.value : ''
        if (['script', 'style'].includes(node.tagName)) return ''
        return (node.childNodes ?? []).map((n: any) => walk(n, active)).join('') + (['p', 'div', 'li', 'h1', 'h2', 'h3', 'br'].includes(node.tagName) ? '\n' : '')
      }
      return walk(parseFragment(value), anchored)
    }
    if (!value || typeof value !== 'object') return ''
    const active = anchored || value.marks?.some((m: any) => m.type === 'comment' && m.attrs?.commentId === commentId)
    if (value.html) return visit(value.html, active)
    if (typeof value.content === 'string') return visit(value.content, active)
    if (value.text !== undefined) return !commentId || active ? value.text : ''
    if (value.attrs?.label) return !commentId || active ? value.attrs.label : ''
    return (value.content ?? []).map((n: any) => visit(n, active)).join('') + (['paragraph', 'heading', 'hardBreak'].includes(value.type) ? '\n' : '')
  }
  return visit(content).replace(/\s+/g, ' ').trim()
}
