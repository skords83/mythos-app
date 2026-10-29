/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
jest.mock('@/lib/auth', () => ({ getAuthContext: jest.fn() }))
jest.mock('@/lib/universe-scope', () => ({ bookEntityScope: jest.fn().mockResolvedValue({ projectId: 'book' }) }))
jest.mock('@/lib/prisma', () => ({ prisma: {
  $transaction: jest.fn(), chapter: { findFirst: jest.fn(), updateMany: jest.fn() },
  chapterVersion: { create: jest.fn() }, character: { findMany: jest.fn() }, place: { findMany: jest.fn() }, item: { findMany: jest.fn() }, comment: { findMany: jest.fn() },
} }))
const revision = new Date('2026-01-01')
function request(body: Record<string, unknown> = {}, origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/integrations/references', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterId: 'chapter', key: '3', expectedUpdatedAt: revision.toISOString(), targetId: null, ...body }) })
}
beforeEach(() => {
  jest.clearAllMocks()
  ;(getAuthContext as jest.Mock).mockResolvedValue({ userId: 'owner', familyId: 'family' })
  ;(prisma.$transaction as jest.Mock).mockImplementation(fn => fn(prisma))
  ;(prisma.chapter.findFirst as jest.Mock).mockResolvedValue({ id: 'chapter', projectId: 'book', wordCount: 1, updatedAt: revision, content: '<p><span data-character-mention="" data-character-id="missing">@Ada</span></p>' })
  ;(prisma.chapter.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
  for (const model of [prisma.character, prisma.place, prisma.item, prisma.comment]) (model.findMany as jest.Mock).mockResolvedValue([])
})
test('requires session and same origin', async () => {
  expect((await POST(request({}, 'https://evil.invalid'))).status).toBe(403)
  ;(getAuthContext as jest.Mock).mockResolvedValue(null)
  expect((await GET(new NextRequest('http://localhost/api/integrations/references?chapterId=chapter'))).status).toBe(401)
  expect((await POST(request())).status).toBe(401)
  expect(prisma.chapter.updateMany).not.toHaveBeenCalled()
})
test('scopes chapters to their owner and rejects stale revision', async () => {
  expect((await POST(request({ expectedUpdatedAt: '2020-01-01' }))).status).toBe(409)
  expect(prisma.chapter.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'chapter', project: { userId: 'owner' } } }))
  expect(prisma.chapter.updateMany).not.toHaveBeenCalled()
  ;(prisma.chapter.findFirst as jest.Mock).mockResolvedValue(null)
  expect((await POST(request())).status).toBe(404)
})
test('only orphaned references and available targets may be changed', async () => {
  expect((await POST(request({ targetId: 'foreign' }))).status).toBe(400)
  ;(prisma.character.findMany as jest.Mock).mockResolvedValue([{ id: 'missing', name: 'Ada' }])
  expect((await POST(request())).status).toBe(409)
  expect(prisma.chapter.updateMany).not.toHaveBeenCalled()
})
test('targeted unlink preserves chapter text and repair uses available target', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(prisma.chapterVersion.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ chapterId: 'chapter', authorId: 'owner', wordCount: 1 }) }))
  expect(prisma.chapter.updateMany).toHaveBeenCalledWith({ where: { id: 'chapter', updatedAt: revision }, data: { content: '<p><span  >@Ada</span></p>' } })
  ;(prisma.character.findMany as jest.Mock).mockResolvedValue([{ id: 'replacement', name: 'Ada' }])
  expect((await POST(request({ targetId: 'replacement' }))).status).toBe(200)
  expect(prisma.chapter.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { content: '<p><span data-character-mention="" data-character-id="replacement">@Ada</span></p>' } }))
})
