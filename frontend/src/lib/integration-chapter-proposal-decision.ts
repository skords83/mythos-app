import { ChapterWriteConflict, isChapterWriteConflict, nextChapterRevision } from './chapter-write-conflict'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canApplyChapterProposal, validateChapterProposal } from '@/lib/integration-chapter-proposal'
import { countTiptapWords } from '@/lib/integration-word-count'
import { proposalToChapterHtml } from '@/lib/integration-proposal-html'
import { hasProtectedChapterContent } from '@/lib/integration-protected-content'

type DecisionResult =
  | { status: 200; proposalId: string; backupId?: string; decision: 'APPLIED' | 'REJECTED' | 'PENDING' }
  | { status: 400 | 404 | 409 | 410; error: string }

/**
 * This is a session-user operation. It accepts NO bearer token and NO client
 * supplied confirmation flag. HTTP handlers must authenticate the Mythos
 * cookie and check same-origin requests before calling this function.
 */
export async function decideChapterProposal(
  userId: string,
  proposalId: string,
  decision: 'approve' | 'reject' | 'resubmit',
): Promise<DecisionResult> {
  if (!userId || !proposalId || proposalId.length > 128 ||
      (decision !== 'approve' && decision !== 'reject' && decision !== 'resubmit')) {
    return { status: 400, error: 'Invalid decision' }
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const proposal = await tx.chapterProposal.findFirst({
        where: { id: proposalId, authorId: userId, chapter: { project: { userId } } },
        select: {
          id: true, status: true, expiresAt: true, expectedUpdatedAt: true,
          title: true, content: true, chapterId: true,
        },
      })
      if (!proposal) return { status: 404, error: 'Proposal not found' } as const
      if (proposal.status !== 'PENDING' && !(proposal.status === 'EXPIRED' && decision !== 'approve')) return { status: 409, error: 'Proposal already decided' } as const

      if (decision === 'reject') {
        const updated = await tx.chapterProposal.updateMany({
          where: { id: proposalId, authorId: userId, status: proposal.status },
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
      if (decision === 'approve' && proposal.expiresAt <= new Date()) return { status: 410, error: 'Proposal expired' } as const
      if (current.updatedAt.getTime() !== proposal.expectedUpdatedAt.getTime()) return { status: 409, error: 'Chapter changed since proposal' } as const
      if (decision === 'approve' && !canApplyChapterProposal(
        proposal.status, proposal.expiresAt, current.updatedAt, proposal.expectedUpdatedAt,
      )) return { status: 409, error: 'Chapter changed since proposal' } as const

      const checked = validateChapterProposal({
        projectId: 'validated-project',
        chapterId: proposal.chapterId,
        expectedUpdatedAt: proposal.expectedUpdatedAt.toISOString(),
        title: proposal.title,
        content: proposal.content,
      })
      if (!checked.ok) return { status: 409, error: 'Stored proposal is invalid' } as const

      if (hasProtectedChapterContent(current.content)) {
        return { status: 409, error: 'Chapter contains protected mentions or comments' } as const
      }

      const html = proposalToChapterHtml(checked.value.content)
      if (html === null) return { status: 409, error: 'Unsupported proposal formatting' } as const

      if (decision === 'resubmit') {
        if (proposal.expiresAt > new Date()) return { status: 409, error: 'Proposal has not expired' } as const
        const renewed = await tx.chapterProposal.updateMany({
          where: { id: proposalId, authorId: userId, status: proposal.status, expiresAt: proposal.expiresAt },
          data: { status: 'PENDING', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        })
        if (renewed.count !== 1) return { status: 409, error: 'Proposal already decided' } as const
        return { status: 200, proposalId, decision: 'PENDING' } as const
      }

      const claimed = await tx.chapterProposal.updateMany({
        where: { id: proposalId, authorId: userId, status: 'PENDING' },
        data: { status: 'APPLIED', appliedAt: new Date() },
      })
      if (claimed.count !== 1) return { status: 409, error: 'Proposal already decided' } as const
      const storedContent = current.content && typeof current.content === 'object' && !Array.isArray(current.content) && typeof current.content.content === 'string'
        ? { ...current.content, content: html } : html
      const changed = await tx.chapter.updateMany({
        where: { id: proposal.chapterId, updatedAt: proposal.expectedUpdatedAt },
        data: {
          title: proposal.title,
          updatedAt: nextChapterRevision(current.updatedAt),
          content: storedContent,
          wordCount: countTiptapWords(checked.value.content),
        },
      })
      if (changed.count !== 1) throw new ChapterWriteConflict('Concurrent chapter update; transaction rolled back')
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
  } catch (error) {
    if (isChapterWriteConflict(error)) return { status: 409, error: 'Concurrent change; reload proposal before deciding again' }
    throw error
  }
}
