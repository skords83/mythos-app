import { canApplyChapterProposal, validateChapterProposal } from './integration-chapter-proposal'

const proposal = {
  projectId: 'project-1', chapterId: 'chapter-1',
  expectedUpdatedAt: '2026-10-16T10:00:00.000Z',
  title: ' Neues Kapitel ',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
}

test('accepts a proposal without granting approval', () => {
  expect(validateChapterProposal(proposal)).toEqual({
    ok: true, value: { ...proposal, title: 'Neues Kapitel' },
  })
})
test('does not trust client-supplied approval flags', () => {
  const result = validateChapterProposal({ ...proposal, confirmed: true, approved: true, state: 'APPLIED' })
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.value).not.toHaveProperty('confirmed')
    expect(result.value).not.toHaveProperty('approved')
    expect(result.value).not.toHaveProperty('state')
  }
})
test('rejects invalid revisions and content', () => {
  expect(validateChapterProposal({ ...proposal, expectedUpdatedAt: 'yesterday' }).ok).toBe(false)
  expect(validateChapterProposal({ ...proposal, content: 'plain text' }).ok).toBe(false)
})
test('only pending, unexpired, unchanged proposals can be applied', () => {
  const revision = new Date(proposal.expectedUpdatedAt)
  const expiry = new Date('2026-10-17T10:00:00.000Z')
  const now = new Date('2026-10-16T11:00:00.000Z')
  expect(canApplyChapterProposal('PENDING', expiry, revision, revision, now)).toBe(true)
  expect(canApplyChapterProposal('REJECTED', expiry, revision, revision, now)).toBe(false)
  expect(canApplyChapterProposal('APPLIED', expiry, revision, revision, now)).toBe(false)
  expect(canApplyChapterProposal('PENDING', now, revision, revision, now)).toBe(false)
  expect(canApplyChapterProposal('PENDING', expiry, new Date('2026-10-16T10:01:00.000Z'), revision, now)).toBe(false)
})

test.each(['image', 'table', 'characterMention', 'unknown'])('rejects unsupported %s at creation', type => {
  expect(validateChapterProposal({ ...proposal, content: { type: 'doc', content: [{ type }] } }).ok).toBe(false)
})

test('never silently drops unsupported content or anchor metadata', () => {
  for (const content of [
    { type: 'doc', content: [], marks: [{ type: 'comment', attrs: { commentId: 'c' } }] },
    { type: 'doc', content: [{ type: 'paragraph', text: 'Would be lost' }] },
    { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text', attrs: { commentId: 'c' } }] }] },
  ]) expect(validateChapterProposal({ ...proposal, content }).ok).toBe(false)
})
