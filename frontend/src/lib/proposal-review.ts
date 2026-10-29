export type ReviewNode = { type?: string; text?: string; attrs?: { label?: string }; content?: ReviewNode[] | string }
export function reviewText(node: ReviewNode | string | null | undefined): string {
  if (typeof node === 'string') {
    if (typeof document === 'undefined') return node.replace(/<[^>]*>/g, ' ')
    const element = document.createElement('div')
    element.innerHTML = node.replace(/<\/(?:p|h[1-6]|li|blockquote)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n')
    return element.textContent || ''
  }
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'characterMention' || node.type === 'entityMention') return `@${node.attrs?.label ?? ''}`
  if (typeof node.content === 'string') return reviewText(node.content)
  return (node.content ?? []).map(reviewText).join(['doc', 'bulletList', 'orderedList', 'blockquote', 'listItem'].includes(node.type ?? '') ? '\n\n' : '')
}
/** Linear-space comparison: common opening/ending, with the changed range in between. */
export function reviewDiff(before: string, after: string) {
  const a = before.split('\n'), b = after.split('\n')
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start && a[a.length - end - 1] === b[b.length - end - 1]) end++
  return { opening: a.slice(0, start).join('\n'), removed: a.slice(start, a.length - end).join('\n'), added: b.slice(start, b.length - end).join('\n'), ending: end ? a.slice(-end).join('\n') : '' }
}
