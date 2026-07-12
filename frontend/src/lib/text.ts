export function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

// DOM-free counterpart to stripHtml() for use outside the browser (e.g. API routes).
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (entity) => HTML_ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSnippet(text: string, query: string, radius = 60): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const matchIndex = trimmed.toLowerCase().indexOf(query.toLowerCase())
  if (matchIndex === -1) {
    return trimmed.length > radius * 2
      ? `${trimmed.slice(0, radius * 2).trim()}…`
      : trimmed
  }
  const start = Math.max(0, matchIndex - radius)
  const end = Math.min(trimmed.length, matchIndex + query.length + radius)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < trimmed.length ? '…' : ''
  return `${prefix}${trimmed.slice(start, end).trim()}${suffix}`
}
