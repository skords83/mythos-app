import { Mark, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/core'

// Schema-only mark, no custom commands — applying/removing it is done with
// Tiptap's built-in editor.chain().focus().setMark('comment', {...}) /
// unsetMark('comment') from the call sites (RichTextEditor's "add comment"
// toolbar action, CommentPopover's delete handler). `resolved` is a
// denormalized copy of the Comment row's state so the highlight can switch
// style without a live join while rendering.
export const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs: { commentId?: string | null }) =>
          attrs.commentId ? { 'data-comment-id': attrs.commentId } : {},
      },
      resolved: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-resolved') === 'true',
        renderHTML: (attrs: { resolved?: boolean }) => ({
          'data-comment-resolved': attrs.resolved ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'mark[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const resolved = HTMLAttributes['data-comment-resolved'] === 'true'
    const stateClass = resolved
      ? 'text-zinc-500 dark:text-zinc-400 border-b border-dotted border-zinc-400 dark:border-zinc-600'
      : 'text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950'
    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        class: `${stateClass} cursor-pointer bg-transparent`,
      }),
      0,
    ]
  },
})

// Marks are immutable — updating `resolved` on every existing instance of a
// given commentId means walking the doc and re-setting the mark at each range.
export function applyCommentResolvedState(editor: Editor, commentId: string, resolved: boolean) {
  const { state } = editor
  const ranges: Array<{ from: number; to: number }> = []
  state.doc.descendants((node, pos) => {
    const mark = node.marks.find(m => m.type.name === 'comment' && m.attrs.commentId === commentId)
    if (mark) {
      ranges.push({ from: pos, to: pos + node.nodeSize })
    }
  })
  if (!ranges.length) return

  let chain = editor.chain()
  for (const { from, to } of ranges) {
    chain = chain.setTextSelection({ from, to }).setMark('comment', { commentId, resolved })
  }
  chain.setTextSelection(state.selection.to).run()
}

// Removes every instance of a comment's mark from the doc (used when a
// comment is deleted, so the highlighted span reverts to plain text).
export function removeCommentMark(editor: Editor, commentId: string) {
  const { state } = editor
  const ranges: Array<{ from: number; to: number }> = []
  state.doc.descendants((node, pos) => {
    const mark = node.marks.find(m => m.type.name === 'comment' && m.attrs.commentId === commentId)
    if (mark) {
      ranges.push({ from: pos, to: pos + node.nodeSize })
    }
  })
  if (!ranges.length) return

  let chain = editor.chain()
  for (const { from, to } of ranges) {
    chain = chain.setTextSelection({ from, to }).unsetMark('comment')
  }
  chain.setTextSelection(state.selection.to).run()
}

// Used by CommentsPanel to detect orphaned rows (DB comment whose mark no
// longer exists anywhere in the current doc, e.g. the anchor text was deleted).
export function commentIdsInDoc(editor: Editor): Set<string> {
  const ids = new Set<string>()
  editor.state.doc.descendants(node => {
    for (const mark of node.marks) {
      if (mark.type.name === 'comment' && mark.attrs.commentId) {
        ids.add(mark.attrs.commentId)
      }
    }
  })
  return ids
}
