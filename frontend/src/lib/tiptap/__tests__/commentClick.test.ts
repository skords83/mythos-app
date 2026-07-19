import { resolveCommentClick } from '../commentClick'

function makeEvent(x: number, y: number): MouseEvent {
  return { clientX: x, clientY: y } as MouseEvent
}

describe('resolveCommentClick', () => {
  it('returns null when no marks are present', () => {
    expect(resolveCommentClick([], makeEvent(10, 20))).toBeNull()
  })

  it('returns null when none of the marks are a comment mark', () => {
    const marks = [{ type: { name: 'bold' }, attrs: {} }]
    expect(resolveCommentClick(marks, makeEvent(10, 20))).toBeNull()
  })

  it('returns null when the comment mark has no commentId', () => {
    const marks = [{ type: { name: 'comment' }, attrs: { commentId: null } }]
    expect(resolveCommentClick(marks, makeEvent(10, 20))).toBeNull()
  })

  it('resolves a comment mark to its commentId and click position', () => {
    const marks = [{ type: { name: 'comment' }, attrs: { commentId: 'c1', resolved: false } }]
    expect(resolveCommentClick(marks, makeEvent(42, 84))).toEqual({
      commentId: 'c1',
      position: { x: 42, y: 84 },
    })
  })

  it('picks the first comment mark when overlapping with other marks (v1 limitation)', () => {
    const marks = [
      { type: { name: 'bold' }, attrs: {} },
      { type: { name: 'comment' }, attrs: { commentId: 'c1', resolved: false } },
      { type: { name: 'comment' }, attrs: { commentId: 'c2', resolved: true } },
    ]
    expect(resolveCommentClick(marks, makeEvent(1, 2))).toEqual({
      commentId: 'c1',
      position: { x: 1, y: 2 },
    })
  })
})
