/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET as list } from '../route'
import { GET as detail } from '../[id]/route'
import { prisma } from '@/lib/prisma'
jest.mock('@/lib/prisma', () => ({ prisma: {
 project: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
 entityUsage: { findMany: jest.fn() }, character: { count: jest.fn() },
} }))
jest.mock('@/lib/auth', () => ({ getUserFromRequest: jest.fn(async () => 'author') }))
const db = prisma as any
beforeEach(() => {
 jest.clearAllMocks()
 const project = () => ({ id: 'book', universeId: 'world', _count: { chapters: 3, characters: 0 } })
 db.project.findMany.mockImplementation(async () => [project()])
 db.project.findFirst.mockImplementation(async () => project())
 db.project.count.mockResolvedValue(1)
 db.entityUsage.findMany.mockResolvedValue([{ entityId: 'shared-character' }])
 db.character.count.mockResolvedValue(2)
})
it.each(['list', 'detail'])('%s counts visible local and explicitly used shared characters', async endpoint => {
 const request = new NextRequest('http://localhost/api/projects')
 const response = endpoint === 'list' ? await list(request) : await detail(request, { params: Promise.resolve({ id: 'book' }) })
 expect(response.status).toBe(200)
 const body = await response.json()
 expect((endpoint === 'list' ? body.projects[0] : body)._count).toEqual({ chapters: 3, characters: 2 })
 expect(db.character.count).toHaveBeenCalledWith({ where: { AND: [
  { OR: [{ projectId: 'book' }, { universeId: 'world', id: { in: ['shared-character'] } }] },
  { OR: [{ visibility: 'FAMILY' }, { authorId: 'author' }] },
 ] } })
})
it('keeps standalone books scoped to local, visible characters', async () => {
 db.project.findFirst.mockResolvedValue({ universeId: null })
 await list(new NextRequest('http://localhost/api/projects'))
 expect(db.entityUsage.findMany).not.toHaveBeenCalled()
 expect(db.character.count.mock.calls[0][0].where.AND[0]).toEqual({ projectId: 'book' })
})
it('does not include every universe character when no book usage exists', async () => {
 db.entityUsage.findMany.mockResolvedValue([])
 await list(new NextRequest('http://localhost/api/projects'))
 expect(db.character.count.mock.calls[0][0].where.AND[0].OR[1]).toEqual({ universeId: 'world', id: { in: [] } })
})
