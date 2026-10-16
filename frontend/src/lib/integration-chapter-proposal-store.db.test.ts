/** @jest-environment node */
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { createPendingChapterProposal } from '@/lib/integration-chapter-proposal-store'

const expectedUrl = 'postgresql://mythos_test:mythos_local_test_2026@127.0.0.1:55432/mythos_integration_test?schema=public'
const enabled = process.env.MYTHOS_RUN_DB_INTEGRATION === '1'
const suite = enabled ? describe : describe.skip

suite('real PostgreSQL pending chapter proposals (isolated local DB)', () => {
  const suffix = randomBytes(8).toString('hex')
  const clientId = 'proposal-test-' + suffix
  const token = 'proposal-token-' + suffix
  const readToken = 'proposal-read-token-' + suffix
  let familyId: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  let chapterId: string | undefined
  const oldContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alte Fassung' }] }] }
  const newContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vorgeschlagene neue Fassung' }] }] }

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) {
      throw new Error('REFUSING DB TEST: DATABASE_URL must match the isolated localhost Mythos test database exactly')
    }
    const family = await prisma.family.create({ data: { name: 'Proposal test ' + suffix } })
    familyId = family.id
    const user = await prisma.user.create({
      data: { email: 'proposal-' + suffix + '@example.invalid', password: 'not-a-login', familyId, role: 'OWNER' },
    })
    userId = user.id
    const project = await prisma.project.create({ data: { title: 'Proposal test', userId } })
    projectId = project.id
    const chapter = await prisma.chapter.create({ data: { projectId, title: 'Original', content: oldContent, wordCount: 2 } })
    chapterId = chapter.id
    await prisma.oAuthClient.create({ data: { id: clientId, name: 'Proposal test', redirectUris: ['http://localhost/callback'] } })
    await prisma.oAuthAccessToken.createMany({
      data: [
        { clientId, userId, tokenHash: hashCredential(token), scope: 'mythos:read mythos:write', expiresAt: new Date('2099-01-01') },
        { clientId, userId, tokenHash: hashCredential(readToken), scope: 'mythos:read', expiresAt: new Date('2099-01-01') },
      ],
    })
  })

  afterAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) return
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } })
    if (userId) await prisma.user.deleteMany({ where: { id: userId } })
    if (familyId) await prisma.family.deleteMany({ where: { id: familyId } })
    await prisma.oAuthClient.deleteMany({ where: { id: clientId } })
    await prisma.$disconnect()
  })

  const payload = async () => {
    const chapter = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    return { projectId: projectId!, chapterId: chapterId!, expectedUpdatedAt: chapter.updatedAt.toISOString(), title: 'Vorschlag', content: newContent }
  }

  test('creates pending proposal without touching chapter or version history', async () => {
    const before = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    const result = await createPendingChapterProposal('Bearer ' + token, await payload())
    expect(result.status).toBe(201)
    if (result.status !== 201) return
    const saved = await prisma.chapterProposal.findUniqueOrThrow({ where: { id: result.proposalId } })
    expect(saved.status).toBe('PENDING')
    expect(saved.authorId).toBe(userId)
    expect(saved.title).toBe('Vorschlag')
    expect(saved.content).toEqual(newContent)
    expect(saved.expectedUpdatedAt).toEqual(before.updatedAt)
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now())
    const unchanged = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    expect(unchanged.title).toBe(before.title)
    expect(unchanged.content).toEqual(before.content)
    expect(unchanged.updatedAt).toEqual(before.updatedAt)
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(0)
  })

  test('read-only token cannot create proposals', async () => {
    const result = await createPendingChapterProposal('Bearer ' + readToken, await payload())
    expect(result.status).toBe(403)
  })

  test('rejects stale chapter revisions', async () => {
    const draft = await payload()
    const result = await createPendingChapterProposal('Bearer ' + token, {
      ...draft, expectedUpdatedAt: '2020-01-01T00:00:00.000Z',
    })
    expect(result.status).toBe(409)
  })

  test('rejects missing or invalid credentials', async () => {
    expect((await createPendingChapterProposal(null, await payload())).status).toBe(401)
    expect((await createPendingChapterProposal('Bearer invalid', await payload())).status).toBe(401)
  })
})
