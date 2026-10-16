type Node = { type?: unknown; text?: unknown; content?: unknown; marks?: unknown }

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Converts a deliberately restricted Tiptap subset to the editor's HTML storage format.
 * Unsupported nodes or marks reject the entire proposal rather than silently losing content.
 */
export function proposalToChapterHtml(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const doc = value as Node
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return null

  function renderInline(value: unknown): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const node = value as Node
    if (node.type === 'hardBreak' && node.marks === undefined && node.content === undefined) return '<br>'
    if (node.type !== 'text' || typeof node.text !== 'string' || node.content !== undefined) return null
    let html = escapeHtml(node.text)
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) return null
      for (const mark of node.marks) {
        if (!mark || typeof mark !== 'object' || Array.isArray(mark)) return null
        const kind = (mark as { type?: unknown }).type
        const tag = kind === 'bold' ? 'strong' : kind === 'italic' ? 'em' : kind === 'strike' ? 's' : kind === 'code' ? 'code' : null
        if (!tag || Object.keys(mark).some(k => k !== 'type')) return null
        html = '<' + tag + '>' + html + '</' + tag + '>'
      }
    }
    return html
  }

  const blocks: string[] = []
  for (const item of doc.content) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const block = item as Node
if (block.marks !== undefined) return null

let tag = 'p'
if (block.type === 'heading') {
  const attrs = (block as Node & { attrs?: unknown }).attrs
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return null
  const headingAttrs = attrs as Record<string, unknown>
  if (Object.keys(headingAttrs).length !== 1) return null
  if (headingAttrs.level !== 1 && headingAttrs.level !== 2) return null
  tag = 'h' + headingAttrs.level
} else if (block.type !== 'paragraph') {
  return null
}
    if (block.content !== undefined && !Array.isArray(block.content)) return null
    const pieces: string[] = []
    for (const inline of (block.content ?? []) as unknown[]) {
      const rendered = renderInline(inline)
      if (rendered === null) return null
      pieces.push(rendered)
    }
blocks.push('<' + tag + '>' + pieces.join('') + '</' + tag + '>')
  }
  return blocks.join('')
}
