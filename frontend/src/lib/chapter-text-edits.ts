import { parseFragment } from 'parse5'
import { inspectParagraphs } from './chapter-paragraph-edits'

export type TextEdit = { nodeId: string; before: string; after: string }
export type TextEdits = { type: 'chapterTextEdits'; edits: TextEdit[]; preview?: unknown }
type Segment = { nodeId: string; text: string; protected: boolean }
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Addresses are revision-local paths, never names or fuzzy matches. HTML is spliced
 * only at parser-proven text locations; every untouched byte remains unchanged. */
export function inspectChapter(content: unknown) {
  const inspected = inspectTextNodes(content)
  const paragraphs = inspectParagraphs(content)
  return { ...inspected, blocks: paragraphs.blocks, apply: (edits: TextEdit[]) => {
    if (edits.some(e => e.nodeId.startsWith('blocks.'))) return paragraphs.apply(edits)
    return inspectTextNodes(content).apply(edits)
  } }
}
function inspectTextNodes(content: unknown) {
  const segments: Segment[] = []
  const setters = new Map<string, (text: string) => void>()
  const value = structuredClone(content)
  let text = ''
  let format = 'tiptap'
  if (value === null || (typeof value === 'object' && value && !Array.isArray(value) && Object.keys(value).length === 0)) {
    return { format: 'empty', text: '', segments, apply: (edits: TextEdit[]) => { applyEdits(edits, segments, setters); return value } }
  }
  const wrapper = value && typeof value === 'object' && !Array.isArray(value) && typeof (value as any).content === 'string' ? value as any : null
  if (typeof value === 'string' || wrapper) {
    format = wrapper ? 'html-wrapper' : 'html'
    const html: string = wrapper ? wrapper.content : value as string
    const root = parseFragment(html, { sourceCodeLocationInfo: true })
    const changes: { start: number; end: number; text: string }[] = []
    const walk = (node: any, path: string, protectedParent: boolean) => {
      const protectedHere = protectedParent || (node.attrs ?? []).some((a: any) => /^data-(character-mention|entity-mention|comment-id)$/.test(a.name)) || ['script', 'style', 'template'].includes(node.tagName)
      if (node.nodeName === '#text') {
        const location = node.sourceCodeLocation
        const segment = { nodeId: path, text: node.value, protected: protectedHere || !location }
        segments.push(segment)
        text += node.value
        if (!segment.protected) setters.set(path, replacement => changes.push({ start: location.startOffset, end: location.endOffset, text: escape(replacement) }))
      }
      for (const [i, child] of (node.childNodes ?? []).entries()) walk(child, `${path}.${i}`, protectedHere)
      if (['p', 'div', 'h1', 'h2', 'h3', 'li', 'blockquote', 'br'].includes(node.tagName)) text += '\n'
    }
    walk(root, 'html', false)
    return { format, text, segments, apply: (edits: TextEdit[]) => {
      applyEdits(edits, segments, setters)
      let updated = html
      for (const change of changes.sort((a, b) => b.start - a.start)) updated = updated.slice(0, change.start) + change.text + updated.slice(change.end)
      return wrapper ? { ...wrapper, content: updated } : updated
    } }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as any).type !== 'doc' || !Array.isArray((value as any).content)) throw new Error('Unsupported stored chapter format; inspect in Mythos before editing')
  const removed = new Set<any>()
  const walk = (node: any, path: string, protectedParent: boolean, depth: number) => {
    if (depth > 100 || !node || typeof node !== 'object' || typeof node.type !== 'string') throw new Error('Malformed chapter document')
    const protectedHere = protectedParent || ['characterMention', 'entityMention', 'mention', 'comment'].includes(node.type) || node.attrs?.commentId !== undefined || (node.marks ?? []).some((m: any) => m.type === 'comment' || m.attrs?.commentId !== undefined)
    if (node.type === 'text') {
      if (typeof node.text !== 'string') throw new Error('Malformed chapter text')
      segments.push({ nodeId: path, text: node.text, protected: protectedHere })
      text += node.text
      if (!protectedHere) setters.set(path, replacement => {
        if (replacement === '') removed.add(node)
        else node.text = replacement
      })
    } else if (['characterMention', 'entityMention', 'mention'].includes(node.type)) {
      const label = typeof node.attrs?.label === 'string' ? node.attrs.label : ''
      segments.push({ nodeId: path, text: label, protected: true })
      text += label
    }
    if (node.content !== undefined && !Array.isArray(node.content)) throw new Error('Malformed chapter children')
    for (const [i, child] of (node.content ?? []).entries()) walk(child, `${path}.${i}`, protectedHere, depth + 1)
    if (['paragraph', 'heading', 'hardBreak'].includes(node.type)) text += '\n'
  }
  walk(value, 'doc', false, 0)
  return { format, text, segments, apply: (edits: TextEdit[]) => {
    applyEdits(edits, segments, setters)
    const clean = (node: any) => {
      if (node.content) {
        node.content = node.content.filter((child: any) => !removed.has(child))
        node.content.forEach(clean)
      }
    }
    if (removed.size) clean(value)
    return value
  } }
}
function applyEdits(edits: TextEdit[], segments: Segment[], setters: Map<string, (text: string) => void>) {
  const seen = new Set<string>()
  for (const edit of edits) {
    const segment = segments.find(s => s.nodeId === edit.nodeId)
    if (!segment || segment.text !== edit.before) throw new Error(`Text conflict at ${edit.nodeId}: read the current chapter and use its exact segment text`)
    if (segment.protected) throw new Error(`Protected text conflict at ${edit.nodeId}: this segment belongs to a mention or comment; edit it in Mythos for explicit review`)
    if (seen.has(edit.nodeId)) throw new Error(`Duplicate text edit at ${edit.nodeId}`)
    seen.add(edit.nodeId)
    if (edit.before !== edit.after) setters.get(edit.nodeId)!(edit.after)
  }
}
export function isTextEdits(value: unknown): value is TextEdits {
  return !!value && typeof value === 'object' && (value as any).type === 'chapterTextEdits'
}
export function validTextEdits(value: TextEdits): boolean {
  return Object.keys(value).every(k => ['type', 'edits', 'preview'].includes(k)) && Array.isArray(value.edits) && value.edits.length > 0 && value.edits.length <= 1000 && value.edits.every(e => e && Object.keys(e).every(k => ['nodeId', 'before', 'after'].includes(k)) && typeof e.nodeId === 'string' && typeof e.before === 'string' && typeof e.after === 'string')
}
