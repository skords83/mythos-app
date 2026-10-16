/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    project: { findMany: jest.fn(), findFirst: jest.fn() },
    chapter: { findMany: jest.fn(), findFirst: jest.fn() },
    character: { findMany: jest.fn() },
    place: { findMany: jest.fn() },
    timelineEvent: { findMany: jest.fn() },
    loreEntry: { findMany: jest.fn() },
  },
}))

const db = prisma as jest.Mocked<typeof prisma>
const endpoint = 'https://example.test/api/integrations/chatgpt'
const token = 'x'.repeat(40)
const originalToken = process.env.MYTHOS_INTEGRATION_READ_TOKEN
const originalUser = process.env.MYTHOS_INTEGRATION_USER_ID
const req = (query: string, authorization = 'Bearer ' + token) =>
  new NextRequest(endpoint + '?' + query, { headers: { authorization } })

beforeEach(() => {
  jest.clearAllMocks()
  process.env.MYTHOS_INTEGRATION_READ_TOKEN = token
  process.env.MYTHOS_INTEGRATION_USER_ID = 'user-1'
  ;(db.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', familyId: 'family-1' })
  ;(db.project.findFirst as jest.Mock).mockResolvedValue({ id: 'project-1' })
  ;(db.project.findMany as jest.Mock).mockResolvedValue([])
  ;(db.character.findMany as jest.Mock).mockResolvedValue([])
  ;(db.chapter.findFirst as jest.Mock).mockResolvedValue(null)
})
afterAll(() => {
  if (originalToken === undefined) delete process.env.MYTHOS_INTEGRATION_READ_TOKEN
  else process.env.MYTHOS_INTEGRATION_READ_TOKEN = originalToken
  if (originalUser === undefined) delete process.env.MYTHOS_INTEGRATION_USER_ID
  else process.env.MYTHOS_INTEGRATION_USER_ID = originalUser
})

test('rejects missing bearer token before querying database', async () => {
  expect((await GET(req('action=projects', ''))).status).toBe(401)
  expect(db.user.findUnique).not.toHaveBeenCalled()
})
test('rejects wrong bearer token', async () => {
  expect((await GET(req('action=projects', 'Bearer wrong'))).status).toBe(401)
})
test('rejects disabled integration', async () => {
  delete process.env.MYTHOS_INTEGRATION_READ_TOKEN
  expect((await GET(req('action=projects'))).status).toBe(401)
})
test('lists only projects owned by configured user', async () => {
  expect((await GET(req('action=projects'))).status).toBe(200)
  expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }))
})
test('denies projects not owned by configured user', async () => {
  ;(db.project.findFirst as jest.Mock).mockResolvedValue(null)
  expect((await GET(req('action=characters&projectId=other'))).status).toBe(404)
  expect(db.character.findMany).not.toHaveBeenCalled()
})
test('enforces private visibility on characters', async () => {
  expect((await GET(req('action=characters&projectId=project-1'))).status).toBe(200)
  expect(db.character.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { projectId: 'project-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
  }))
})
test('rejects invalid pagination values', async () => {
  for (const query of ['action=projects&page=-1', 'action=projects&limit=101', 'action=projects&page=1.5']) {
    expect((await GET(req(query))).status).toBe(400)
  }
})
test('does not retrieve chapters outside selected project', async () => {
  expect((await GET(req('action=chapter&projectId=project-1&id=chapter-1'))).status).toBe(404)
  expect(db.chapter.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'chapter-1', projectId: 'project-1' },
  }))
})
