/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({ prisma: {
  project: { findFirst: jest.fn() }, character: { findMany: jest.fn() }, place: { findMany: jest.fn() },
  note: { findMany: jest.fn() }, item: { findMany: jest.fn() }, faction: { findMany: jest.fn() },
  scene: { findMany: jest.fn() }, timelineEvent: { findMany: jest.fn() }, loreEntry: { findMany: jest.fn() },
  idea: { findMany: jest.fn() }, $queryRaw: jest.fn(),
} }))
const db = prisma as any
function request() {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'reader', email: 'test@example.com', familyId: 'family', role: 'ADULT' })
  return new NextRequest('http://localhost/api/search?projectId=project&q=Text', { headers: { cookie: `auth-token=${token}` } })
}
beforeEach(() => {
  jest.resetAllMocks()
  for (const model of ['character', 'place', 'note', 'item', 'faction', 'scene', 'timelineEvent', 'loreEntry', 'idea']) db[model].findMany.mockResolvedValue([])
  db.$queryRaw.mockResolvedValue([])
})
it('does not search private chapters or notes of another family member', async () => {
  db.project.findFirst.mockResolvedValue({ userId: 'another-member' })
  db.character.findMany.mockResolvedValue([{ id: 'c1', name: 'Text' }])
  const response = await GET(request())
  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.chapters).toEqual([])
  expect(data.notes).toEqual([])
  expect(data.characters).toHaveLength(1)
  expect(db.note.findMany).not.toHaveBeenCalled()
  expect(db.$queryRaw).not.toHaveBeenCalled()
  expect(db.character.findMany.mock.calls[0][0].where.AND).toContainEqual({ OR: [{ visibility: 'FAMILY' }, { authorId: 'reader' }] })
})
it('still searches the owners chapters and notes', async () => {
  db.project.findFirst.mockResolvedValue({ userId: 'reader' })
  db.$queryRaw.mockResolvedValue([{ id: 'c1', title: 'Kapitel', content: '<p>Text</p>' }])
  db.note.findMany.mockResolvedValue([{ id: 'n1', title: 'Notiz', content: 'Text', chapterId: 'c1' }])
  const data = await (await GET(request())).json()
  expect(data.chapters).toHaveLength(1)
  expect(data.notes).toHaveLength(1)
})
it('rejects projects outside the family before any content search', async () => {
  db.project.findFirst.mockResolvedValue(null)
  expect((await GET(request())).status).toBe(404)
  expect(db.project.findFirst.mock.calls[0][0].where).toEqual({ id: 'project', user: { familyId: 'family' } })
  expect(db.$queryRaw).not.toHaveBeenCalled()
  expect(db.character.findMany).not.toHaveBeenCalled()
})
it('requires authentication', async () => {
  expect((await GET(new NextRequest('http://localhost/api/search?projectId=p&q=Text'))).status).toBe(401)
})
