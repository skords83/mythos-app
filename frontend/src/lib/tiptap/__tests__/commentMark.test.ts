import { CommentMark } from '../commentMark'

// Mirrors what Tiptap core actually does before calling mark.renderHTML: it runs
// each attribute's own renderHTML and merges the results into HTMLAttributes.
function computeHTMLAttributes(markAttrs: { commentId?: string | null; resolved?: boolean }) {
  const attrs = (CommentMark.config.addAttributes as any).call(CommentMark.config)
  return {
    ...attrs.commentId.renderHTML(markAttrs),
    ...attrs.resolved.renderHTML(markAttrs),
  }
}

describe('CommentMark config', () => {
  it('renderHTML produces a mark tag with an amber highlight when unresolved', () => {
    const markAttrs = { commentId: 'c1', resolved: false }
    const result = (CommentMark.config.renderHTML as any).call(CommentMark.config, {
      HTMLAttributes: computeHTMLAttributes(markAttrs),
    })

    expect(Array.isArray(result)).toBe(true)
    const [tag, attrs, content] = result as [string, Record<string, any>, number]
    expect(tag).toBe('mark')
    expect(attrs['data-comment-id']).toBe('c1')
    expect(attrs['data-comment-resolved']).toBe('false')
    expect(attrs.class).toContain('bg-amber-100')
    expect(content).toBe(0)
  })

  it('renderHTML switches to a muted dotted-underline treatment when resolved', () => {
    const markAttrs = { commentId: 'c1', resolved: true }
    const result = (CommentMark.config.renderHTML as any).call(CommentMark.config, {
      HTMLAttributes: computeHTMLAttributes(markAttrs),
    })
    const [, attrs] = result as [string, Record<string, any>, number]
    expect(attrs['data-comment-resolved']).toBe('true')
    expect(attrs.class).toContain('border-dotted')
  })

  it('parseHTML matches the data-comment-id mark selector', () => {
    const rules = CommentMark.config.parseHTML!.call(CommentMark.config as any)
    expect(rules).toEqual(expect.arrayContaining([expect.objectContaining({ tag: 'mark[data-comment-id]' })]))
  })

  it('the commentId/resolved attributes parse back from data-comment-id/data-comment-resolved', () => {
    const attrs = (CommentMark.config.addAttributes as any).call(CommentMark.config)
    const el = document.createElement('mark')
    el.setAttribute('data-comment-id', 'c9')
    el.setAttribute('data-comment-resolved', 'true')
    expect(attrs.commentId.parseHTML(el)).toBe('c9')
    expect(attrs.resolved.parseHTML(el)).toBe(true)
  })

  it('omits the data-comment-id attribute when commentId is missing', () => {
    const attrs = (CommentMark.config.addAttributes as any).call(CommentMark.config)
    expect(attrs.commentId.renderHTML({ commentId: null })).toEqual({})
  })
})
