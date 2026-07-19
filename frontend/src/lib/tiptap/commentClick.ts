interface MarkLike {
  type: { name: string }
  attrs: Record<string, any>
}

export interface CommentClickResult {
  commentId: string
  position: { x: number; y: number }
}

// Marks (unlike mention nodes) can overlap on the same span — this returns the
// first matching comment mark found, an accepted v1 limitation for overlapping
// comments.
export function resolveCommentClick(marks: readonly MarkLike[], event: MouseEvent): CommentClickResult | null {
  const position = { x: event.clientX, y: event.clientY }
  const mark = marks.find(m => m.type.name === 'comment' && m.attrs.commentId)
  if (!mark) return null
  return { commentId: mark.attrs.commentId, position }
}
