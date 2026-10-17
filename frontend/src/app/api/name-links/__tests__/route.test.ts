/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { Prisma } from '@prisma/client'
jest.mock('@/lib/auth', () => ({ getAuthContext: jest.fn() }))
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }))
jest.mock('@/lib/prisma', () => ({ prisma: {
  project: { findFirst: jest.fn() },
  character: { findMany: jest.fn() }, place: { findMany: jest.fn() }, item: { findMany: jest.fn() },
  chapter: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
  chapterVersion: { create: jest.fn() }, $transaction: jest.fn(),
} }))
const db = prisma as any
const chapter = { id: 'c', projectId: 'p', title: 'Kapitel', content: '<p>Fabian</p>', updatedAt: new Date('2026-01-01'), wordCount: 1 }
const request = (body: object) => POST(new NextRequest('http://localhost/api/name-links', { method: 'POST', body: JSON.stringify({ projectId: 'p', kinds: ['CHARACTER', 'PLACE'], ...body }) }))
let fingerprint: string
beforeEach(async () => {
  jest.resetAllMocks()
  ;(getAuthContext as jest.Mock).mockResolvedValue({ userId: 'u', familyId: 'f' })
  db.project.findFirst.mockResolvedValue({ id: 'p' })
  db.character.findMany.mockResolvedValue([{ id: 'f', name: 'Fabian', aliases: [] }])
  db.place.findMany.mockResolvedValue([]); db.item.findMany.mockResolvedValue([])
  db.chapter.findMany.mockResolvedValue([chapter]); db.chapter.findFirst.mockResolvedValue(chapter)
  db.chapter.findUnique.mockResolvedValue(chapter); db.chapter.updateMany.mockResolvedValue({ count: 1 })
  db.$transaction.mockImplementation((fn: any) => fn(db))
  fingerprint = (await (await request({ action: 'preview' })).json()).fingerprint
})
const apply = () => request({ action: 'apply', chapterId: 'c', updatedAt: chapter.updatedAt.toISOString(), fingerprint, selected: ['CHARACTER:f'] })
test('checks authentication and project ownership on the server', async () => {
  expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: 'p', userId: 'u' } })
  db.project.findFirst.mockResolvedValue(null)
  expect((await apply()).status).toBe(404)
  ;(getAuthContext as jest.Mock).mockResolvedValue(null)
  expect((await apply()).status).toBe(401)
  expect(db.chapter.updateMany).not.toHaveBeenCalled()
})
test('applies with CAS and creates a restoration version in a serializable transaction', async () => {
  expect(await (await apply()).json()).toMatchObject({ status: 'processed', added: 1 })
  expect(db.chapter.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c', updatedAt: chapter.updatedAt, project: { userId: 'u' } } }))
  expect(db.chapterVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ chapterId: 'c', content: chapter.content, authorId: 'u', familyId: 'f' }) })
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
})
test('skips concurrent chapter edits without writing or creating versions', async () => {
  db.chapter.findFirst.mockResolvedValue({ ...chapter, updatedAt: new Date('2026-02-01') })
  expect(await (await apply()).json()).toMatchObject({ status: 'skipped', added: 0 })
  expect(db.chapter.updateMany).not.toHaveBeenCalled(); expect(db.chapterVersion.create).not.toHaveBeenCalled()
})
test('invalidates the preview when aliases or cross-type collisions change', async () => {
  db.place.findMany.mockResolvedValue([{ id: 'p2', name: 'Fabian', aliases: [] }])
  expect(await (await apply()).json()).toMatchObject({ status: 'skipped', added: 0 })
  expect(db.chapter.updateMany).not.toHaveBeenCalled()
})
test('repeat on linked content creates no writes or versions', async () => {
  db.chapter.findFirst.mockResolvedValue({ ...chapter, content: '<p><span data-character-mention="" data-character-id="f">@Fabian</span></p>' })
  expect(await (await apply()).json()).toMatchObject({ status: 'processed', added: 0 })
  expect(db.chapter.updateMany).not.toHaveBeenCalled(); expect(db.chapterVersion.create).not.toHaveBeenCalled()
})
test('reports a transaction conflict as skipped and a database failure as failed', async () => {
  db.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: '5' }))
  expect(await (await apply()).json()).toMatchObject({ status: 'skipped' })
  db.$transaction.mockRejectedValue(new Error('database unavailable'))
  expect((await apply()).status).toBe(500)
})
