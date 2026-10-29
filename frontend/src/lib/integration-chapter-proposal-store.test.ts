/** @jest-environment node */
import { createPendingChapterProposal } from './integration-chapter-proposal-store'
import { prisma } from './prisma'
jest.mock('./prisma', () => ({ prisma: {
  oAuthAccessToken: { findUnique: jest.fn() }, project: { findFirst: jest.fn() }, chapter: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() }, chapterProposal: { create: jest.fn() },
} }))
const revision = new Date('2026-01-01')
const input = { projectId: 'project', chapterId: 'chapter', expectedUpdatedAt: revision.toISOString(), title: 'Titel', content: { type: 'doc', content: [{ type: 'paragraph' }] } }
beforeEach(() => {
  jest.clearAllMocks()
  ;(prisma.oAuthAccessToken.findUnique as jest.Mock).mockResolvedValue({ userId: 'u', scope: 'mythos:read mythos:write', expiresAt: new Date('2099-01-01') })
  ;(prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'project' })
  ;(prisma.chapter.findFirst as jest.Mock).mockResolvedValue({ updatedAt: revision, content: {} })
  ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'f' })
  ;(prisma.chapterProposal.create as jest.Mock).mockResolvedValue({ id: 'p' })
})
test('accepts empty legacy chapter and supported formatting', async () => {
  expect(await createPendingChapterProposal('Bearer token', input)).toEqual({ status: 201, proposalId: 'p' })
})
test('unsupported formatting is rejected before persistence', async () => {
  expect((await createPendingChapterProposal('Bearer token', { ...input, content: { type: 'doc', content: [{ type: 'image' }] } })).status).toBe(400)
  expect(prisma.chapterProposal.create).not.toHaveBeenCalled()
})
test('existing protected content is rejected at creation as well as approval', async () => {
  ;(prisma.chapter.findFirst as jest.Mock).mockResolvedValue({ updatedAt: revision, content: '<span data-character-mention="" data-character-id="c">@Ada</span>' })
  expect((await createPendingChapterProposal('Bearer token', input)).status).toBe(409)
  expect(prisma.chapterProposal.create).not.toHaveBeenCalled()
})
