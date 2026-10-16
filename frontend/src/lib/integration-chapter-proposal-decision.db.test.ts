/** @jest-environment node */
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { createPendingChapterProposal } from '@/lib/integration-chapter-proposal-store'
import { decideChapterProposal } from '@/lib/integration-chapter-proposal-decision'

const expectedUrl = 'postgresql://mythos_test:mythos_local_test_2026@127.0.0.1:55432/mythos_integration_test?schema=public'
const suite = process.env.MYTHOS_RUN_DB_INTEGRATION === '1' ? describe : describe.skip

suite('real PostgreSQL proposal approval (isolated local DB)', () => {
  const suffix = randomBytes(8).toString('hex')
  const clientId = 'approval-test-' + suffix
  const token = 'approval-token-' + suffix
  let familyId: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  let chapterId: string | undefined
  const oldContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alte Fassung' }] }] }
  const newContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Eine ganz neue Fassung' }] }] }

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) throw new Error('REFUSING DB TEST: isolated localhost test database required')
    const family = await prisma.family.create({ data: { name: 'Approval test ' + suffix } })
    familyId = family.id
    const user = await prisma.user.create({
      data: { email: 'approval-' + suffix + '@example.invalid', password: 'not-a-login', familyId, role: 'OWNER' },
    })
    userId = user.id
    const project = await prisma.project.create({ data: { title: 'Approval test', userId } })
    projectId = project.id
    const chapter = await prisma.chapter.create({ data: { projectId, title: 'Original', content: oldContent, wordCount: 2 } })
    chapterId = chapter.id
    await prisma.oAuthClient.create({ data: { id: clientId, name: 'Approval test', redirectUris: ['http://localhost/callback'] } })
    await prisma.oAuthAccessToken.create({
      data: { clientId, userId, tokenHash: hashCredential(token), scope: 'mythos:write', expiresAt: new Date('2099-01-01') },
    })
  })

  afterAll(async () => {
    if (process.env.DATABASE_URL !== expectedUrl) return
    try {
      if (projectId) await prisma.project.deleteMany({ where: { id: projectId } })
      if (userId) await prisma.user.deleteMany({ where: { id: userId } })
      if (familyId) await prisma.family.deleteMany({ where: { id: familyId } })
      if (userId) await prisma.oAuthClient.deleteMany({ where: { id: clientId } })
    } finally {
      await prisma.$disconnect()
    }
  })

  async function propose() {
    const chapter = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    const result = await createPendingChapterProposal('Bearer ' + token, {
      projectId, chapterId, expectedUpdatedAt: chapter.updatedAt.toISOString(),
      title: 'Genehmigte Fassung', content: newContent,
    })
    expect(result.status).toBe(201)
    if (result.status !== 201) throw new Error('Proposal creation failed')
    return result.proposalId
  }

  test('approval saves backup and new content exactly once', async () => {
    const proposalId = await propose()
    const before = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    expect((await decideChapterProposal('another-user', proposalId, 'approve')).status).toBe(404)
    const result = await decideChapterProposal(userId!, proposalId, 'approve')
    expect(result.status).toBe(200)
    if (result.status !== 200) return
    expect(result.decision).toBe('APPLIED')
    const chapter = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    expect(chapter.title).toBe('Genehmigte Fassung')
    expect(chapter.content).toEqual(newContent)
    expect(chapter.wordCount).toBe(4)
    const backup = await prisma.chapterVersion.findUniqueOrThrow({ where: { id: result.backupId! } })
    expect(backup.content).toEqual(before.content)
    expect(backup.wordCount).toBe(before.wordCount)
    expect((await prisma.chapterProposal.findUniqueOrThrow({ where: { id: proposalId } })).status).toBe('APPLIED')
    expect((await decideChapterProposal(userId!, proposalId, 'approve')).status).toBe(409)
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(1)
  })

  test('rejection leaves chapter and versions unchanged', async () => {
    const proposalId = await propose()
    const before = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })
    const count = await prisma.chapterVersion.count({ where: { chapterId } })
    const result = await decideChapterProposal(userId!, proposalId, 'reject')
    expect(result).toMatchObject({ status: 200, decision: 'REJECTED' })
    expect((await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId! } })).content).toEqual(before.content)
    expect(await prisma.chapterVersion.count({ where: { chapterId } })).toBe(count)
    expect((await decideChapterProposal(userId!, proposalId, 'approve')).status).toBe(409)
  })

  test('stale chapter revision prevents approval', async () => {
    const proposalId = await propose()
    await prisma.chapter.update({ where: { id: chapterId! }, data: { title: 'Zwischenzeitlich bearbeitet' } })
    const result = await decideChapterProposal(userId!, proposalId, 'approve')
    expect(result.status).toBe(409)
    expect((await prisma.chapterProposal.findUniqueOrThrow({ where: { id: proposalId } })).status).toBe('PENDING')
  })

  test('expired proposal cannot be approved', async () => {
    const proposalId = await propose()
    await prisma.chapterProposal.update({ where: { id: proposalId }, data: { expiresAt: new Date('2020-01-01') } })
    expect((await decideChapterProposal(userId!, proposalId, 'approve')).status).toBe(410)
  })
})
