import { parseFragment } from 'parse5'
import type { TextEdit } from './chapter-text-edits'

type Block = { nodeId: string; editable: boolean; text: string; tokens: { token: string; text: string }[] }
type InternalBlock = Block & { original: any; start: number; end: number; atoms: Map<string, any> }
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tokenPattern = /⟦mythos:[^⟧]*⟧/g
const readable = (node: any): string => node.value ?? node.text ?? node.attrs?.label ??
  (node.childNodes ?? node.content ?? []).map(readable).join('')

/** Paragraph ranges reuse opaque inline nodes, including all marks/anchors. No
 * generated markup or fuzzy identity matching is accepted from the caller. */
export function inspectParagraphs(content: any) {
  const wrapper = content && typeof content === 'object' && typeof content.content === 'string'
  const html = typeof content === 'string' ? content : wrapper ? content.content : null
  const sourceNodes: any[] = html !== null
    ? (parseFragment(html, { sourceCodeLocationInfo: true }) as any).childNodes
    : content?.type === 'doc' ? content.content : []
  const nodes = sourceNodes.filter(node => html === null || node.nodeName !== '#text' || node.value.trim() !== '')
  const protectedDocument = html === null && (content?.attrs?.commentId !== undefined || content?.marks?.length)
  const blocks: InternalBlock[] = nodes.map((node, index) => {
    const location = node.sourceCodeLocation
    const block: InternalBlock = {
      nodeId: `blocks.${index}-${index}`, editable: html !== null
        ? node.tagName === 'p' && !node.attrs.length && !!location?.startTag && !!location?.endTag
        : !protectedDocument && node.type === 'paragraph' && !Object.keys(node.attrs ?? {}).length && !node.marks?.length,
      text: '', tokens: [], atoms: new Map(), original: node,
      start: location?.startOffset ?? index, end: location?.endOffset ?? index + 1,
    }
    if (!block.editable) return block
    for (const [i, child] of (html !== null ? node.childNodes : node.content ?? []).entries()) {
      const plain = html !== null ? child.nodeName === '#text' : child.type === 'text' && !child.marks?.length && !child.attrs
      if (plain) {
        const text = html !== null ? child.value : child.text
        // Reserved delimiters or literal double newlines cannot be interpreted
        // losslessly as paragraph templates; node edits remain available.
        if (typeof text !== 'string' || text.includes('⟦mythos:') || text.includes('\n\n')) block.editable = false
        block.text += text
      } else {
        const token = `⟦mythos:${index}:${i}⟧`
        if (html !== null && (!child.sourceCodeLocation || child.sourceCodeLocation.startOffset < location.startTag.endOffset || child.sourceCodeLocation.endOffset > location.endTag.startOffset)) { block.editable = false; continue }
        const atom = html !== null ? html.slice(child.sourceCodeLocation.startOffset, child.sourceCodeLocation.endOffset) : child
        block.atoms.set(token, atom)
        const label = readable(child)
        block.tokens.push({ token, text: label })
        block.text += token
      }
    }
    return block
  })
  return {
    blocks: blocks.map(({ nodeId, editable, text, tokens }) => ({ nodeId, editable, text, tokens })),
    apply(edits: TextEdit[]) {
      const ranges = edits.map(edit => {
        const match = /^blocks\.(\d+)-(\d+)$/.exec(edit.nodeId)
        if (!match) throw new Error('Cannot mix paragraph ranges and text node edits in one proposal')
        const start = Number(match[1]), end = Number(match[2])
        if (end < start || end >= blocks.length) throw new Error(`Paragraph range conflict at ${edit.nodeId}: invalid range`)
        const selected = blocks.slice(start, end + 1)
        if (selected.some(b => !b.editable)) throw new Error(`Protected paragraph structure at ${edit.nodeId}: select plain top-level paragraphs or use text node edits`)
        if (selected.map(b => b.text).join('\n\n') !== edit.before) throw new Error(`Text conflict at ${edit.nodeId}: use exact block templates from the current chapter`)
        const atoms = new Map(selected.flatMap(b => [...b.atoms.entries()]))
        const found: string[] = edit.after.match(tokenPattern) ?? []
        if (found.length !== atoms.size || new Set(found).size !== found.length || found.some(t => !atoms.has(t))) {
          const present = new Set(found)
          const missing = [...atoms.keys()].filter(token => !present.has(token))
          const unexpected = found.filter((token, index) => !atoms.has(token) || found.indexOf(token) !== index)
          throw new Error(`Protected token conflict at ${edit.nodeId}: preserve each inline token exactly once; missing (${missing.length}): ${missing.slice(0, 8).join(', ')}; unknown/duplicate (${unexpected.length}): ${unexpected.slice(0, 8).join(', ')}`)
        }
        if (edit.after.replace(tokenPattern, '').includes('⟦mythos:')) throw new Error(`Malformed protected token at ${edit.nodeId}`)
        const reusable = [...selected]
        const originalText = new Map<string, string[]>()
        if (html !== null) for (const block of selected) for (const child of block.original.childNodes) {
          if (child.nodeName === '#text' && child.sourceCodeLocation) {
            const raw = html.slice(child.sourceCodeLocation.startOffset, child.sourceCodeLocation.endOffset)
            originalText.set(child.value, [...(originalText.get(child.value) ?? []), raw])
          }
        }
        const renderText = (text: string) => originalText.get(text)?.shift() ?? escape(text)
        const paragraphs = edit.after === '' ? [] : edit.after.split('\n\n').map(template => {
          const same = reusable.findIndex(b => b.text === template)
          if (same >= 0) {
            const original = reusable.splice(same, 1)[0]
            return html !== null ? html.slice(original.start, original.end) : original.original
          }
          const pieces = template.split(/(⟦mythos:[^⟧]*⟧)/g).filter(Boolean)
          return html !== null
            ? '<p>' + pieces.map(p => atoms.has(p) ? atoms.get(p) : renderText(p)).join('') + '</p>'
            : { type: 'paragraph', content: pieces.map(p => atoms.has(p) ? atoms.get(p) : { type: 'text', text: p }) }
        })
        return { start, end, paragraphs, unchanged: edit.before === edit.after }
      }).sort((a, b) => a.start - b.start)
      for (let i = 1; i < ranges.length; i++) if (ranges[i].start <= ranges[i - 1].end) throw new Error('Overlapping paragraph ranges; combine them into one edit')
      if (html !== null) {
        let result = html
        for (const range of ranges.reverse()) if (!range.unchanged) result = result.slice(0, blocks[range.start].start) + range.paragraphs.join('') + result.slice(blocks[range.end].end)
        return wrapper ? { ...content, content: result } : result
      }
      const result = structuredClone(content)
      for (const range of ranges.reverse()) result.content.splice(range.start, range.end - range.start + 1, ...structuredClone(range.paragraphs))
      return result
    },
  }
}
