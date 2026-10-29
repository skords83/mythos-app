import { nextChapterRevision } from './chapter-write-conflict'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { hasMythosScope } from '@/lib/integration-permissions'
import { validateChapterReplacement } from '@/lib/integration-chapter-write'
import { countTiptapWords } from '@/lib/integration-word-count'

type ReplaceResult =
  | { status: 200; chapterId: string; backupId: string }
  | { status: 400 | 401 | 403 | 404 | 409; error: string }

/**
 * Database operation only. No public write endpoint or MCP write tool is exposed.
 * The bearer is checked again inside the transaction before any mutation.
 */
export async function replaceChapterWithBackup(
  bearer: string | null,
  projectId: string,
  chapterId: string,
  input: unknown,
): Promise<ReplaceResult> {
  const parsed = validateChapterReplacement(input)
  if (!parsed.ok) return { status: 400, error: 'Invalid replacement request' }
  if (!bearer?.startsWith('Bearer ') || bearer.length > 519) return { status: 401, error: 'Unauthorized' }
  const token = bearer.slice(7)
  if (!token) return { status: 401, error: 'Unauthorized' }
  if (!projectId || !chapterId || projectId.length > 128 || chapterId.length > 128) {
    return { status: 400, error: 'Invalid identifiers' }
  }

  return prisma.$transaction(async (tx) => {
    const auth = await tx.oAuthAccessToken.findUnique({
      where: { tokenHash: hashCredential(token) },
      select: { userId: true, scope: true, expiresAt: true, revokedAt: true },
    })
    if (!auth || auth.revokedAt || auth.expiresAt <= new Date()) {
      return { status: 401, error: 'Unauthorized' } as const
    }
    if (!hasMythosScope(auth.scope, 'mythos:write')) {
      return { status: 403, error: 'Write scope required' } as const
    }
    const project = await tx.project.findFirst({
      where: { id: projectId, userId: auth.userId },
      select: { id: true },
    })
    if (!project) return { status: 404, error: 'Project not found' } as const

    // Conditional UPDATE is the compare-and-swap guard against concurrent edits.
    const current = await tx.chapter.findFirst({
      where: { id: chapterId, projectId },
      select: { id: true, title: true, content: true, wordCount: true, updatedAt: true },
    })
    if (!current) return { status: 404, error: 'Chapter not found' } as const
    const expected = new Date(parsed.value.expectedUpdatedAt)
    if (current.updatedAt.getTime() !== expected.getTime()) {
      return { status: 409, error: 'Chapter changed since last read' } as const
    }

    const changed = await tx.chapter.updateMany({
      where: { id: chapterId, projectId, updatedAt: expected },
      data: {
        title: parsed.value.title,
        updatedAt: nextChapterRevision(current.updatedAt),
        content: parsed.value.content as Prisma.InputJsonValue,
        wordCount: countTiptapWords(parsed.value.content),
      },
    })
    if (changed.count !== 1) return { status: 409, error: 'Chapter changed since last read' } as const

    // The old version is saved within the SAME transaction. A failed backup
    // rolls back the conditional chapter update.
    const owner = await tx.user.findUnique({
      where: { id: auth.userId }, select: { familyId: true },
    })
    if (!owner) throw new Error('Authenticated user no longer exists')
    const backup = await tx.chapterVersion.create({
      data: {
        name: 'Vor ChatGPT-Übernahme ' + new Date().toISOString(),
        chapterId, authorId: auth.userId, familyId: owner.familyId,
        content: current.content === null ? Prisma.JsonNull : current.content as Prisma.InputJsonValue,
        wordCount: current.wordCount,
      },
      select: { id: true },
    })
    return { status: 200, chapterId, backupId: backup.id } as const
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
