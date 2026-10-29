/** @jest-environment node */
import { prisma } from './prisma'
import { decideChapterProposal } from './integration-chapter-proposal-decision'
jest.mock('./prisma', () => ({ prisma: { $transaction: jest.fn() } }))
const revision = new Date('2026-01-01')
const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Neu' }] }] }
function setup(status = 'PENDING', chapterContent: unknown = {}) {
  const proposal = { id: 'p', status, expiresAt: new Date('2020-01-01'), expectedUpdatedAt: revision, chapterId: 'c', title: 'Titel', content }
  const tx = {
    chapterProposal: { findFirst: jest.fn().mockResolvedValue(proposal), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    chapter: { findUnique: jest.fn().mockResolvedValue({ updatedAt: revision, content: chapterContent, wordCount: 0 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    user: { findUnique: jest.fn().mockResolvedValue({ familyId: 'f' }) }, chapterVersion: { create: jest.fn().mockResolvedValue({ id: 'backup' }) },
  }
  ;(prisma.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  return { proposal, tx }
}
test.each(['PENDING', 'EXPIRED'])('expired %s proposal can be discarded without changing chapter', async status => {
  const { tx } = setup(status)
  expect(await decideChapterProposal('u', 'p', 'reject')).toMatchObject({ status: 200, decision: 'REJECTED' })
  expect(tx.chapter.updateMany).not.toHaveBeenCalled()
})
test('expired proposal cannot be approved; renewal requires another approval', async () => {
  const { tx } = setup()
  expect((await decideChapterProposal('u', 'p', 'approve')).status).toBe(410)
  expect(await decideChapterProposal('u', 'p', 'resubmit')).toMatchObject({ status: 200, decision: 'PENDING' })
  expect(tx.chapterProposal.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'PENDING', expiresAt: expect.any(Date) } }))
  expect(tx.chapter.updateMany).not.toHaveBeenCalled()
})
test('changed revisions and protected content prevent renewal', async () => {
  const { tx } = setup()
  tx.chapter.findUnique.mockResolvedValue({ updatedAt: new Date(), content: {}, wordCount: 0 })
  expect((await decideChapterProposal('u', 'p', 'resubmit')).status).toBe(409)
  expect(tx.chapterProposal.updateMany).not.toHaveBeenCalled()
  setup('PENDING', '<mark data-comment-id="c">Text</mark>')
  expect((await decideChapterProposal('u', 'p', 'resubmit')).status).toBe(409)
})
test('empty object chapter is approvable and backed up', async () => {
  const { proposal, tx } = setup()
  proposal.expiresAt = new Date('2099-01-01')
  expect(await decideChapterProposal('u', 'p', 'approve')).toMatchObject({ status: 200, decision: 'APPLIED', backupId: 'backup' })
  expect(tx.chapter.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'Titel', content: '<p>Neu</p>', wordCount: 1, updatedAt: expect.any(Date) }) }))
  expect(tx.chapterVersion.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: {} }) }))
})
test('rejects decided proposals and unavailable proposals', async () => {
  setup('REJECTED')
  expect((await decideChapterProposal('u', 'p', 'resubmit')).status).toBe(409)
  const { tx } = setup()
  tx.chapterProposal.findFirst.mockResolvedValue(null)
  expect((await decideChapterProposal('other', 'p', 'reject')).status).toBe(404)
})

test('stored EXPIRED proposal renews once and cannot bypass revision or format checks', async () => {
  const { proposal, tx } = setup('EXPIRED')
  expect((await decideChapterProposal('u', 'p', 'resubmit')).status).toBe(200)
  tx.chapterProposal.updateMany.mockResolvedValue({ count: 0 })
  expect((await decideChapterProposal('u', 'p', 'resubmit')).status).toBe(409)
  ;(proposal as { content: unknown }).content = { type: 'doc', content: [{ type: 'image' }] }
  expect((await decideChapterProposal('u', 'p', 'resubmit')).status).toBe(409)
  expect(tx.chapter.updateMany).not.toHaveBeenCalled()
})

test('serialization conflicts return 409 instead of an internal error', async () => {
  const { Prisma } = await import('@prisma/client')
  ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Prisma.PrismaClientKnownRequestError('write conflict', { code: 'P2034', clientVersion: '5.22.0' }))
  expect((await decideChapterProposal('u', 'p', 'approve')).status).toBe(409)
})

test('approval preserves metadata in legacy HTML chapter wrappers', async () => {
  const { proposal, tx } = setup('PENDING', { content: '<p>Alt</p>', metadata: { layout: 'legacy' } })
  proposal.expiresAt = new Date('2099-01-01')
  expect((await decideChapterProposal('u', 'p', 'approve')).status).toBe(200)
  expect(tx.chapter.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: { content: '<p>Neu</p>', metadata: { layout: 'legacy' } } }) }))
})
