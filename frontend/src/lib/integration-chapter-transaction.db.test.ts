/** @jest-environment node */
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { replaceChapterWithBackup } from '@/lib/integration-chapter-transaction'

// This suite is opt-in. It must NEVER run against a normal application database.
const expectedUrl = 'postgresql://mythos_test:mythos_local_test_2026@127.0.0.1:55432/mythos_integration_test?schema=public'
const enabled = process.env.MYTHOS_RUN_DB_INTEGRATION === '1'
const suite = enabled ? describe : describe.skip

suite('real PostgreSQL chapter replacement (disposable local DB only)', () => {
  const suffix = randomBytes(8).toString('hex')
  const clientId = 'integration-client-' + suffix
  const token = 'integration-token-' + suffix
  let familyId: string
  let userId: string
  let projectId: string
  let chapterId: string

  const oldContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alte Fassung' }] }] }
  const newContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Neue Fassung mit vier Worten' }] }] }

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) {
      throw new Error('REFUSING DB TEST: DATABASE_URL must match the isolated localhost Mythos test database exactly')
    }
    const family = await prisma.family.create({ data: { name: 'Integrationstest ' + suffix } })
    familyId = family.id
    const user = await prisma.user.create({
      data: { email: 'integration-' + suffix + '@example.invalid', password: 'not-a-login', familyId, role: 'OWNER' },
    })
    userId = user.id
    const project = await prisma.project.create({ data: { title: 'Integrationstest', userId } })
    projectId = project.id
    const chapter = await prisma.chapter.create({
      data: { projectId, title: 'Vorher', content: oldContent, wordCount: 2 },
    })
    chapterId = chapter.id
    await prisma.oAuthClient.create({ data: { id: clientId, name: 'Integrationstest', redirectUris: ['http://localhost/callback'] } })
    await prisma.oAuthAccessToken.create({
      data: { clientId, userId, tokenHash: hashCredential(token), scope: 'mythos:read mythos:write', expiresAt: new Date('2099-01-01') },
    })
  })

  afterAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) return
    // Cleanup is limited to rows owned by this uniquely named test fixture.
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } })
    if (userId) await prisma.user.deleteMany({ where: { id: userId } })
    if (familyId) await prisma.family.deleteMany({ where: { id: familyId } })
    await prisma.oAuthClient.deleteMany({ where: { id: clientId } })
    await prisma.$disconnect()
  })

  test('preserves old content, updates words and rejects stale edits', async () => {
    const before = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } })
    const payload = {
      confirmed: true, expectedUpdatedAt: before.updatedAt.toISOString(),
      title: 'Nachher', content: newContent,
    }
    const result = await replaceChapterWithBackup('Bearer ' + token, projectId, chapterId, payload)
    expect(result.status).toBe(200)
    if (result.status !== 200) return

    const saved = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } })
    expect(saved.title).toBe('Nachher')
    expect(saved.content).toEqual(newContent)
    expect(saved.wordCount).toBe(5)

    const backup = await prisma.chapterVersion.findUniqueOrThrow({ where: { id: result.backupId } })
    expect(backup.content).toEqual(oldContent)
    expect(backup.wordCount).toBe(2)
    expect(backup.authorId).toBe(userId)

    const stale = await replaceChapterWithBackup('Bearer ' + token, projectId, chapterId, payload)
    expect(stale.status).toBe(409)
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(1)
  })

  test('rejects missing explicit confirmation without changes', async () => {
    const current = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } })
    const result = await replaceChapterWithBackup('Bearer ' + token, projectId, chapterId, {
      confirmed: false, expectedUpdatedAt: current.updatedAt.toISOString(), title: 'Unzulässig', content: newContent,
    })
    expect(result.status).toBe(400)
    expect((await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } })).title).toBe(current.title)
  })
})
