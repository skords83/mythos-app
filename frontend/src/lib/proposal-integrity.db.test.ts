/** @jest-environment node */
import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { signAuthToken } from './auth'
import { decideChapterProposal } from './integration-chapter-proposal-decision'
import { PUT as autosave } from '@/app/api/chapters/[id]/route'
import { GET as inspect, POST as changeReference } from '@/app/api/integrations/references/route'

const expectedUrl = 'postgresql://mythos_test:mythos_local_test_2026@127.0.0.1:55432/mythos_integration_test?schema=public'
const suite = process.env.MYTHOS_RUN_DB_INTEGRATION === '1' ? describe : describe.skip
const original = '<p>Original &amp; vollständig.</p>'
const proposed = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Neue Fassung' }] }] }

suite('PR 4 integrity on disposable PostgreSQL only', () => {
  let familyId: string, userId: string, otherId: string, projectId: string, chapterId: string, cookie: string
  const originalSecret = process.env.JWT_SECRET
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) throw new Error('REFUSING non-isolated test database')
    process.env.JWT_SECRET = 'pr4-disposable-test-session-secret'
    const family = await prisma.family.create({ data: { name: 'PR4 integrity ' + randomUUID() } })
    familyId = family.id
    const user = await prisma.user.create({ data: { familyId, email: randomUUID() + '@example.invalid', password: 'not-a-login' } })
    const other = await prisma.user.create({ data: { familyId, email: randomUUID() + '@example.invalid', password: 'not-a-login' } })
    userId = user.id; otherId = other.id
    projectId = (await prisma.project.create({ data: { title: 'Disposable PR4 fixture', userId } })).id
    cookie = 'auth-token=' + signAuthToken({ userId, familyId, email: user.email, role: 'OWNER' })
  })
  beforeEach(async () => {
    chapterId = (await prisma.chapter.create({ data: { projectId, title: 'Original', content: original, wordCount: 3 } })).id
  })
  afterEach(() => jest.restoreAllMocks())
  afterAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) return
    if (familyId) await prisma.family.delete({ where: { id: familyId } })
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
    await prisma.$disconnect()
  })
  const chapter = () => prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } })
  async function proposal(content: Prisma.InputJsonValue = proposed, status: 'PENDING' | 'EXPIRED' = 'PENDING', expiresAt = new Date(Date.now() + 86400000)) {
    return prisma.chapterProposal.create({ data: { chapterId, authorId: userId, familyId, title: 'Vorschlag', content, status, expiresAt, expectedUpdatedAt: (await chapter()).updatedAt } })
  }
  function request(path: string, body?: unknown, session = cookie, origin = 'http://localhost') {
    return new NextRequest('http://localhost' + path, { method: body === undefined ? 'GET' : 'POST', headers: { cookie: session, origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  }
  async function save(revision: string, content = '<p>Autosave-Fassung</p>') {
    const req = new NextRequest('http://localhost/api/chapters/' + chapterId, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ content, wordCount: 1, expectedUpdatedAt: revision }) })
    return autosave(req, { params: Promise.resolve({ id: chapterId }) })
  }
  async function references(session = cookie) {
    const response = await inspect(request('/api/integrations/references?chapterId=' + chapterId, undefined, session))
    return { response, data: await response.json() }
  }
  async function change(key: string, targetId: string | null, revision: string, session = cookie, origin = 'http://localhost') {
    return changeReference(request('/api/integrations/references', { chapterId, key, targetId, expectedUpdatedAt: revision }, session, origin))
  }

  test('missing revision cannot overwrite an approved chapter; same-tick revisions advance', async () => {
    const future = new Date('2099-01-01')
    await prisma.chapter.update({ where: { id: chapterId }, data: { updatedAt: future } })
    const p = await proposal()
    expect((await decideChapterProposal(userId, p.id, 'approve')).status).toBe(200)
    const applied = await chapter()
    expect(applied.updatedAt.getTime()).toBeGreaterThan(future.getTime())
    expect((await save(future.toISOString())).status).toBe(409)
    const req = new NextRequest('http://localhost/api/chapters/' + chapterId, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'stale without revision' }) })
    expect((await autosave(req, { params: Promise.resolve({ id: chapterId }) })).status).toBe(400)
    expect((await chapter()).content).toBe(applied.content)
    expect((await save(applied.updatedAt.toISOString())).status).toBe(200)
    expect((await chapter()).updatedAt.getTime()).toBeGreaterThan(applied.updatedAt.getTime())
  })

  test('simultaneous autosave and approval have exactly one winner and an atomic backup', async () => {
    const p = await proposal()
    const before = await chapter()
    const transact = prisma.$transaction.bind(prisma)
    let arrivals = 0
    let release!: () => void
    const barrier = new Promise<void>(resolve => { release = resolve })
    const timeout = setTimeout(release, 2000)
    jest.spyOn(prisma, '$transaction').mockImplementation(((callback: any, options: any) => transact(async tx => {
      const chapters = new Proxy(tx.chapter, { get(target, key) {
        if (key === 'updateMany') return async (args: any) => {
          if (++arrivals === 2) release()
          await barrier
          return target.updateMany(args)
        }
        return Reflect.get(target, key)
      } })
      return callback(new Proxy(tx, { get(target, key) { return key === 'chapter' ? chapters : Reflect.get(target, key) } }))
    }, options)) as any)
    let approval, saved
    try { [approval, saved] = await Promise.all([decideChapterProposal(userId, p.id, 'approve'), save(before.updatedAt.toISOString())]) }
    finally { clearTimeout(timeout) }
    expect(arrivals).toBe(2)
    expect([approval.status, saved.status].sort()).toEqual([200, 409])
    const final = await chapter()
    const versions = await prisma.chapterVersion.findMany({ where: { chapterId } })
    const stored = await prisma.chapterProposal.findUniqueOrThrow({ where: { id: p.id } })
    if (approval.status === 200) {
      expect(final.content).toBe('<p>Neue Fassung</p>')
      expect(stored.status).toBe('APPLIED')
      expect(versions).toHaveLength(1)
      expect(versions[0].content).toBe(before.content)
    } else {
      expect(final.content).toBe('<p>Autosave-Fassung</p>')
      expect(stored.status).toBe('PENDING')
      expect(versions).toHaveLength(0)
    }
    expect(final.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
  })

  test('backup failure rolls back both chapter content and proposal status', async () => {
    const p = await proposal()
    const transact = prisma.$transaction.bind(prisma)
    jest.spyOn(prisma, '$transaction').mockImplementation(((callback: any, options: any) => transact(tx => callback(new Proxy(tx, { get(target, key) {
      return key === 'chapterVersion' ? { create: async () => { throw new Error('simulated backup failure') } } : Reflect.get(target, key)
    } })), options)) as any)
    await expect(decideChapterProposal(userId, p.id, 'approve')).rejects.toThrow('simulated backup failure')
    expect((await chapter()).content).toBe(original)
    expect((await prisma.chapterProposal.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('PENDING')
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(0)
  })

  test.each(['PENDING', 'EXPIRED'] as const)('expired %s renews without writing text; rejection is final', async status => {
    const p = await proposal(proposed, status, new Date('2020-01-01'))
    const before = await chapter()
    expect((await decideChapterProposal(userId, p.id, 'resubmit')).status).toBe(200)
    const renewed = await prisma.chapterProposal.findUniqueOrThrow({ where: { id: p.id } })
    expect(renewed.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(renewed.status).toBe('PENDING')
    expect((await chapter()).updatedAt).toEqual(before.updatedAt)
    expect((await chapter()).content).toBe(before.content)
    expect((await decideChapterProposal(userId, p.id, 'reject')).status).toBe(200)
    expect((await decideChapterProposal(userId, p.id, 'resubmit')).status).toBe(409)
  })

  test('older unsupported proposals can be discarded but cannot be renewed or applied', async () => {
    const p = await proposal({ type: 'doc', content: [{ type: 'table' }] }, 'EXPIRED', new Date('2020-01-01'))
    expect((await decideChapterProposal(userId, p.id, 'resubmit')).status).toBe(409)
    expect((await decideChapterProposal(userId, p.id, 'reject')).status).toBe(200)
    expect((await chapter()).content).toBe(original)
  })

  test('mentions and comment anchors block approval without changing content or versions', async () => {
    const protectedText = '<p><mark data-comment-id="c"><span data-character-mention="" data-character-id="x">@Ada</span></mark></p>'
    await prisma.chapter.update({ where: { id: chapterId }, data: { content: protectedText } })
    const p = await proposal()
    expect((await decideChapterProposal(userId, p.id, 'approve')).status).toBe(409)
    expect((await chapter()).content).toBe(protectedText)
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(0)
  })

  test('hidden live entities/comments are unavailable, not orphaned, and reveal no target content', async () => {
    const character = await prisma.character.create({ data: { name: 'SECRET CHARACTER NAME', familyId, authorId: otherId, projectId, visibility: 'PRIVATE' } })
    const comment = await prisma.comment.create({ data: { content: 'SECRET COMMENT CONTENT', familyId, authorId: otherId, chapterId, visibility: 'PRIVATE' } })
    await prisma.chapter.update({ where: { id: chapterId }, data: { content: `<p><span data-character-mention="" data-character-id="${character.id}">@Text</span><mark data-comment-id="${comment.id}">Text</mark></p>` } })
    const { data } = await references()
    expect(data.references).toHaveLength(2)
    expect(data.references.every((r: any) => !r.orphaned && r.unavailable)).toBe(true)
    expect(JSON.stringify(data)).not.toMatch(/SECRET CHARACTER NAME|SECRET COMMENT CONTENT/)
    expect((await change(data.references[0].key, null, data.updatedAt)).status).toBe(409)
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(0)
  })

  test('repairing a comment keeps text and uses the target comment state', async () => {
    const comment = await prisma.comment.create({ data: { content: 'New unresolved comment', familyId, authorId: userId, chapterId, resolved: false } })
    const html = '<p><mark data-comment-id="gone" data-comment-resolved="true">Visible &amp; unchanged</mark></p>'
    await prisma.chapter.update({ where: { id: chapterId }, data: { content: html } })
    const { data } = await references()
    expect((await change(data.references[0].key, comment.id, data.updatedAt)).status).toBe(200)
    expect((await chapter()).content).toBe(`<p><mark data-comment-id="${comment.id}" data-comment-resolved="false">Visible &amp; unchanged</mark></p>`)
    expect((await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } })).resolved).toBe(false)
    expect((await prisma.chapterVersion.findFirstOrThrow({ where: { chapterId } })).content).toBe(html)
  })

  test('unlink preserves source text and live nested anchors; stale changes and foreign sessions fail', async () => {
    const comment = await prisma.comment.create({ data: { content: 'Live comment', familyId, authorId: userId, chapterId } })
    const html = `<p>Vor &amp; <mark data-comment-id="${comment.id}"><span data-character-mention="" data-character-id="missing"><em>@Ada</em></span></mark> danach.</p>`
    await prisma.chapter.update({ where: { id: chapterId }, data: { content: html, updatedAt: new Date('2099-01-01') } })
    const { data } = await references()
    const orphan = data.references.find((r: any) => r.orphaned)
    const foreignCookie = 'auth-token=' + signAuthToken({ userId: otherId, familyId, email: 'other@example.invalid', role: 'OWNER' })
    expect((await references('')).response.status).toBe(401)
    expect((await change(orphan.key, null, data.updatedAt, '')).status).toBe(401)
    expect((await references(foreignCookie)).response.status).toBe(404)
    expect((await change(orphan.key, null, data.updatedAt, foreignCookie)).status).toBe(404)
    expect((await change(orphan.key, null, data.updatedAt, cookie, 'https://evil.invalid')).status).toBe(403)
    expect((await change(orphan.key, 'unavailable-target', data.updatedAt)).status).toBe(400)
    expect((await change(orphan.key, null, data.updatedAt)).status).toBe(200)
    expect((await chapter()).content).toBe(html.replace('data-character-mention=""', '').replace('data-character-id="missing"', ''))
    expect((await chapter()).updatedAt.getTime()).toBeGreaterThan(Date.parse(data.updatedAt))
    expect((await change(orphan.key, null, data.updatedAt)).status).toBe(409)
    const versions = await prisma.chapterVersion.findMany({ where: { chapterId } })
    expect(versions).toHaveLength(1)
    expect(versions[0].content).toBe(html)
    expect((await references()).data.references).toEqual([expect.objectContaining({ kind: 'COMMENT', targetId: comment.id, orphaned: false })])
  })
})
