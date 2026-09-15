/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { middleware } from '@/middleware'

jest.mock('@/lib/prisma', () => ({ prisma: {
  upload: { findUnique: jest.fn() }, character: { findFirst: jest.fn() },
  placeImage: { findFirst: jest.fn() }, chapterVersion: { findFirst: jest.fn() },
} }))
jest.mock('fs/promises', () => ({ readFile: jest.fn() }))
const db = prisma as unknown as Record<string, Record<string, jest.Mock>>
const filename = 'a6bbe40f-6894-48fc-8a9b-f9653f83b76f.png'
function request(userId?: string) {
  process.env.JWT_SECRET = 'test-secret'
  return new NextRequest(`http://localhost/api/upload/${filename}`, userId ? { headers: { cookie: `auth-token=${signAuthToken({ userId, email: 'test@example.com', familyId: 'family', role: 'ADULT' })}` } } : {})
}
beforeEach(() => {
  jest.resetAllMocks()
  db.upload.findUnique.mockResolvedValue({ filename, ownerIds: ['owner'] })
  jest.mocked(readFile).mockResolvedValue(Buffer.from('image-data'))
})
it('rejects anonymous readers before reading a file', async () => {
  expect((await GET(request(), { params: { filename } })).status).toBe(401)
  expect(readFile).not.toHaveBeenCalled()
  expect(db.upload.findUnique).not.toHaveBeenCalled()
})
it('serves the owner with no shared or persistent cache', async () => {
  const response = await GET(request('owner'), { params: { filename } })
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(await response.text()).toBe('image-data')
})
it('rejects another logged-in user when there is no authorized share', async () => {
  expect((await GET(request('stranger'), { params: { filename } })).status).toBe(404)
  expect(readFile).not.toHaveBeenCalled()
})
it('does not grant ownership from a guessed or copied URL', async () => {
  db.upload.findUnique.mockResolvedValue(null)
  expect((await GET(request('owner'), { params: { filename } })).status).toBe(404)
  expect(readFile).not.toHaveBeenCalled()
})
it.each(['character', 'placeImage', 'chapterVersion'])('permits an authorized %s share', async model => {
  db[model].findFirst.mockResolvedValue({ id: 'shared' })
  expect((await GET(request('reader'), { params: { filename } })).status).toBe(200)
  expect(db[model].findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
    familyId: 'family', authorId: { in: ['owner'] },
  }) }))
})
it('checks the parent place visibility for shared images', async () => {
  await GET(request('reader'), { params: { filename } })
  expect(db.placeImage.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
    place: { familyId: 'family', OR: [{ visibility: 'FAMILY' }, { authorId: 'reader' }] },
  }) }))
})
it('rejects path traversal without reading files', async () => {
  expect((await GET(request('owner'), { params: { filename: '../secret.png' } })).status).toBe(404)
  expect(readFile).not.toHaveBeenCalled()
})
it('routes legacy public upload URLs through the same authorization', () => {
  const response = middleware(new NextRequest(`http://localhost/uploads/${filename}`))
  expect(response.headers.get('x-middleware-rewrite')).toBe(`http://localhost/api/upload/${filename}`)
})
