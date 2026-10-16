import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canApplyChapterProposal } from '@/lib/integration-chapter-proposal'
import { countTiptapWords } from '@/lib/integration-word-count'

type DecisionResult =
  | { status: 200; proposalId: string; backupId?: string; decision: 'APPLIED' | 'REJECTED' }
  | { status: 400 | 404 | 409 | 410; error: string }

/**
 * This is a session-user operation. It accepts NO bearer token and NO client
 * supplied confirmation flag. HTTP handlers must authenticate the Mythos
 * cookie and check same-origin requests before calling this function.
 */
export async function decideChapterProposal(
  userId: string,
  proposalId: string,
  decision: 'approve' | 'reject',
): Promise<DecisionResult> {
  if (!userId || !proposalId || proposalId.length > 128 ||
      (decision !== 'approve' && decision !== 'reject')) {
    return { status: 400, error: 'Invalid decision' }
  }
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.chapterProposal.findFirst({
      where: { id: proposalId, authorId: userId, chapter: { project: { userId } } },
      select: {
        id: true, status: true, expiresAt: true, expectedUpdatedAt: true,
        title: true, content: true, chapterId: true,
      },
    })
    if (!proposal) return { status: 404, error: 'Proposal not found' } as const
    if (proposal.status !== 'PENDING') return { status: 409, error: 'Proposal already decided' } as const
    if (proposal.expiresAt <= new Date()) return { status: 410, error: 'Proposal expired' } as const

    if (decision === 'reject') {
      const updated = await tx.chapterProposal.updateMany({
        where: { id: proposalId, authorId: userId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      })
      if (updated.count !== 1) return { status: 409, error: 'Proposal already decided' } as const
      return { status: 200, proposalId, decision: 'REJECTED' } as const
    }

    const current = await tx.chapter.findUnique({
      where: { id: proposal.chapterId },
      select: { title: true, content: true, wordCount: true, updatedAt: true },
    })
    if (!current) return { status: 404, error: 'Chapter not found' } as const
    if (!canApplyChapterProposal(
      proposal.status, proposal.expiresAt, current.updatedAt, proposal.expectedUpdatedAt,
    )) return { status: 409, error: 'Chapter changed since proposal' } as const

    const claimed = await tx.chapterProposal.updateMany({
      where: { id: proposalId, authorId: userId, status: 'PENDING' },
      data: { status: 'APPLIED', appliedAt: new Date() },
    })
    if (claimed.count !== 1) return { status: 409, error: 'Proposal already decided' } as const
    const changed = await tx.chapter.updateMany({
      where: { id: proposal.chapterId, updatedAt: proposal.expectedUpdatedAt },
      data: {
        title: proposal.title,
        content: proposal.content as Prisma.InputJsonValue,
        wordCount: countTiptapWords(proposal.content),
      },
    })
    if (changed.count !== 1) throw new Error('Concurrent chapter update; transaction rolled back')
    const owner = await tx.user.findUnique({ where: { id: userId }, select: { familyId: true } })
    if (!owner) throw new Error('Authenticated user no longer exists')
    const backup = await tx.chapterVersion.create({
      data: {
        name: 'Vor bestätigter ChatGPT-Übernahme ' + new Date().toISOString(),
        chapterId: proposal.chapterId, authorId: userId, familyId: owner.familyId,
        content: current.content === null ? Prisma.JsonNull : current.content as Prisma.InputJsonValue,
        wordCount: current.wordCount,
      },
      select: { id: true },
    })
    return { status: 200, proposalId, backupId: backup.id, decision: 'APPLIED' } as const
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
