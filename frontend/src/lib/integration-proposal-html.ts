
type Node = {
  type?: unknown
  text?: unknown
  content?: unknown
  marks?: unknown
  attrs?: unknown
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Converts a restricted Tiptap subset to HTML.
 * Unsupported structures reject the entire proposal.
 */
export function proposalToChapterHtml(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const doc = value as Node
  if (doc.type !== 'doc' || !Array.isArray(doc.content) || Object.keys(doc).some(key => !['type', 'content'].includes(key))) return null

  function renderInline(value: unknown): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const node = value as Node
    if (Object.keys(node).some(key => !['type', 'text', 'marks'].includes(key))) return null

    if (node.type === 'hardBreak' && node.marks === undefined && node.content === undefined && node.text === undefined) {
      return '<br>'
    }

    if (node.type !== 'text' || typeof node.text !== 'string' || node.content !== undefined) {
      return null
    }

    let html = escapeHtml(node.text)

    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) return null

      for (const mark of node.marks) {
        if (!mark || typeof mark !== 'object' || Array.isArray(mark)) return null

        const kind = (mark as Node).type
        const tag =
          kind === 'bold' ? 'strong' :
          kind === 'italic' ? 'em' :
          kind === 'strike' ? 's' :
          kind === 'code' ? 'code' : null

        if (!tag || Object.keys(mark).some(key => key !== 'type')) return null

        html = `<${tag}>${html}</${tag}>`
      }
    }

    return html
  }

  function renderBlock(value: unknown, depth = 0): string | null {
    if (depth > 20) return null
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const node = value as Node
    if (Object.keys(node).some(key => !['type', 'content', 'attrs'].includes(key))) return null
    if (node.marks !== undefined) return null
    if (node.content !== undefined && !Array.isArray(node.content)) return null

    const children = (node.content ?? []) as unknown[]

    if (node.type === 'paragraph' || node.type === 'heading') {
      let tag = 'p'

      if (node.type === 'heading') {
        if (!node.attrs || typeof node.attrs !== 'object' || Array.isArray(node.attrs)) return null
        const attrs = node.attrs as Record<string, unknown>

        if (Object.keys(attrs).length !== 1) return null
        if (attrs.level !== 1 && attrs.level !== 2) return null

        tag = `h${attrs.level}`
      } else if (node.attrs !== undefined) {
        return null
      }

      const parts: string[] = []

      for (const child of children) {
        const rendered = renderInline(child)
        if (rendered === null) return null
        parts.push(rendered)
      }

      return `<${tag}>${parts.join('')}</${tag}>`
    }

    if (node.type === 'blockquote') {
      if (node.attrs !== undefined) return null

      const parts: string[] = []
      for (const child of children) {
        const rendered = renderBlock(child, depth + 1)
        if (rendered === null) return null
        parts.push(rendered)
      }

      return `<blockquote>${parts.join('')}</blockquote>`
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      if (children.length === 0) return null

      let tag = 'ul'
      let attribute = ''
      if (node.type === 'orderedList') {
        tag = 'ol'

        if (node.attrs !== undefined) {
          if (!node.attrs || typeof node.attrs !== 'object' || Array.isArray(node.attrs)) return null

          const attrs = node.attrs as Record<string, unknown>
          if (Object.keys(attrs).some(key => key !== 'start')) return null

          if (attrs.start !== undefined) {
            if (!Number.isSafeInteger(attrs.start) || (attrs.start as number) < 1) return null
            if (attrs.start !== 1) attribute = ` start="${attrs.start}"`
          }
        }
      } else if (node.attrs !== undefined) {
        return null
      }

      const parts: string[] = []

      for (const child of children) {
        if (!child || typeof child !== 'object' || Array.isArray(child)) return null
        if ((child as Node).type !== 'listItem') return null

        const rendered = renderBlock(child, depth + 1)
        if (rendered === null) return null
        parts.push(rendered)
      }

      return `<${tag}${attribute}>${parts.join('')}</${tag}>`
    }

    if (node.type === 'listItem') {
      if (node.attrs !== undefined) return null
      if (children.length === 0 || (children[0] as Node | null)?.type !== 'paragraph') return null

      const parts: string[] = []

      for (const child of children) {
        if (!child || typeof child !== 'object' || Array.isArray(child)) return null

        const kind = (child as Node).type
        if (kind !== 'paragraph' && kind !== 'bulletList' && kind !== 'orderedList') return null

        const rendered = renderBlock(child, depth + 1)
        if (rendered === null) return null
        parts.push(rendered)
      }

      return `<li>${parts.join('')}</li>`
    }

    return null
  }

  const blocks: string[] = []

  for (const child of doc.content) {
    if (!child || typeof child !== 'object' || Array.isArray(child)) return null

    const type = (child as Node).type
    if (type === 'listItem') return null

    const rendered = renderBlock(child)
    if (rendered === null) return null

    blocks.push(rendered)
  }

  return blocks.join('')
}
