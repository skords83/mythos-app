/** @jest-environment node */
import { replaceChapterWithBackup } from './integration-chapter-transaction'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}))
jest.mock('@/lib/oauth-credentials', () => ({
  hashCredential: jest.fn(() => 'hashed-token'),
}))

const payload = {
  confirmed: true,
  expectedUpdatedAt: '2026-10-16T10:00:00.000Z',
  title: 'Kapitel 24',
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Neu' }] }] },
}
const oldChapter = {
  id: 'chapter-1', title: 'Alt', content: { type: 'doc', content: [] },
  wordCount: 12, updatedAt: new Date(payload.expectedUpdatedAt),
}
function mockTransaction(overrides: Record<string, unknown> = {}) {
  const tx = {
    oAuthAccessToken: { findUnique: jest.fn().mockResolvedValue({
      userId: 'user-1', scope: 'mythos:read mythos:write',
      expiresAt: new Date('2099-01-01'), revokedAt: null,
    }) },
    project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }) },
    chapter: {
      findFirst: jest.fn().mockResolvedValue(oldChapter),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: { findUnique: jest.fn().mockResolvedValue({ familyId: 'family-1' }) },
    chapterVersion: { create: jest.fn().mockResolvedValue({ id: 'backup-1' }) },
    ...overrides,
  }
  ;(prisma.$transaction as jest.Mock).mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx))
  return tx
}
beforeEach(() => jest.clearAllMocks())

test('saves previous chapter version in the same transaction', async () => {
  const tx = mockTransaction()
  const result = await replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', payload)
  expect(result).toEqual({ status: 200, chapterId: 'chapter-1', backupId: 'backup-1' })
  expect(tx.chapter.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'chapter-1', projectId: 'project-1', updatedAt: new Date(payload.expectedUpdatedAt) },
    data: expect.objectContaining({ wordCount: 1 }),
  }))
  expect(tx.chapterVersion.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ chapterId: 'chapter-1', wordCount: 12, content: oldChapter.content }),
  }))
})
test('rejects read-only tokens before any mutation', async () => {
  const tx = mockTransaction()
  tx.oAuthAccessToken.findUnique.mockResolvedValue({
    userId: 'user-1', scope: 'mythos:read', expiresAt: new Date('2099-01-01'), revokedAt: null,
  })
  expect((await replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', payload)).status).toBe(403)
  expect(tx.chapter.updateMany).not.toHaveBeenCalled()
})
test('rejects unconfirmed updates without starting transaction', async () => {
  expect((await replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', { ...payload, confirmed: false })).status).toBe(400)
  expect(prisma.$transaction).not.toHaveBeenCalled()
})
test('rejects a stale revision before mutation', async () => {
  const tx = mockTransaction()
  tx.chapter.findFirst.mockResolvedValue({ ...oldChapter, updatedAt: new Date('2026-10-16T10:01:00.000Z') })
  expect((await replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', payload)).status).toBe(409)
  expect(tx.chapter.updateMany).not.toHaveBeenCalled()
})
test('rejects concurrent update when compare-and-swap fails', async () => {
  const tx = mockTransaction()
  tx.chapter.updateMany.mockResolvedValue({ count: 0 })
  expect((await replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', payload)).status).toBe(409)
  expect(tx.chapterVersion.create).not.toHaveBeenCalled()
})
test('propagates backup failure to roll back transaction', async () => {
  const tx = mockTransaction()
  tx.chapterVersion.create.mockRejectedValue(new Error('Backup failed'))
  await expect(replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', payload)).rejects.toThrow('Backup failed')
})
test('rejects access to projects not owned by the token user', async () => {
  const tx = mockTransaction()
  tx.project.findFirst.mockResolvedValue(null)
  expect((await replaceChapterWithBackup('Bearer valid', 'project-1', 'chapter-1', payload)).status).toBe(404)
  expect(tx.chapter.updateMany).not.toHaveBeenCalled()
})
