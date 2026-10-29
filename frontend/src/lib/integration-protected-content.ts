/** Unknown formats fail closed; empty legacy documents and ordinary Tiptap prose are safe. */
export function hasProtectedChapterContent(content: unknown): boolean {
  if (content === null) return false
  if (typeof content === 'string') return /data-(?:character-mention|entity-mention|comment-id)(?=[\s=/><])/i.test(content)
  if (!content || typeof content !== 'object' || Array.isArray(content)) return true
  const node = content as Record<string, unknown>
  if (Object.keys(node).length === 0) return false
  if (typeof node.content === 'string') return hasProtectedChapterContent(node.content)
  if (['characterMention', 'entityMention', 'mention', 'comment'].includes(String(node.type))) return true
  if (node.attrs && typeof node.attrs === 'object' && 'commentId' in node.attrs) return true
  if (node.marks !== undefined && (!Array.isArray(node.marks) || node.marks.some(hasProtectedChapterContent))) return true
  if (typeof node.type !== 'string') return true
  if (node.type === 'doc' && !Array.isArray(node.content)) return true
  return node.content !== undefined && (!Array.isArray(node.content) || node.content.some(hasProtectedChapterContent))
}
