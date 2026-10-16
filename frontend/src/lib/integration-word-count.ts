/** Count words in Tiptap text nodes, excluding structural metadata and marks. */
export function countTiptapWords(doc: { type: 'doc'; content: unknown[] }): number {
  const chunks: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const n = node as Record<string, unknown>
    if (n.type === 'text' && typeof n.text === 'string') chunks.push(n.text)
    if (Array.isArray(n.content)) for (const child of n.content) walk(child)
  }
  walk(doc)
  const text = chunks.join(' ').trim()
  return text ? text.split(/\s+/u).length : 0
}
