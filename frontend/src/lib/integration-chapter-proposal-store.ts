import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { hasMythosScope } from '@/lib/integration-permissions'
import { hasProtectedChapterContent } from '@/lib/integration-protected-content'
import { validateChapterProposal } from '@/lib/integration-chapter-proposal'

/**
 * Persists an UNAPPROVED proposal. Never updates a chapter.
 * The MCP handler checks resource binding before calling this function.
 */
export async function createPendingChapterProposal(bearer: string | null, input: unknown):
  Promise<{ status: 201; proposalId: string } | { status: 400 | 401 | 403 | 404 | 409; error: string }> {
  const parsed = validateChapterProposal(input)
  if (!parsed.ok) return { status: 400, error: 'Invalid proposal' }
  if (!bearer || !/^Bearer /i.test(bearer) || bearer.length > 519) return { status: 401, error: 'Unauthorized' }
  const token = bearer.slice(7)
  if (!token) return { status: 401, error: 'Unauthorized' }
  const auth = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash: hashCredential(token) },
    select: { userId: true, scope: true, expiresAt: true, revokedAt: true },
  })
  if (!auth || auth.revokedAt || auth.expiresAt <= new Date()) return { status: 401, error: 'Unauthorized' }
  if (!hasMythosScope(auth.scope, 'mythos:write')) return { status: 403, error: 'Write scope required' }

  const { projectId, chapterId, expectedUpdatedAt, title, content } = parsed.value
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: auth.userId },
    select: { id: true },
  })
  if (!project) return { status: 404, error: 'Project not found' }
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, projectId },
    select: { updatedAt: true, content: true },
  })
  if (!chapter) return { status: 404, error: 'Chapter not found' }
  if (chapter.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
    return { status: 409, error: 'Chapter changed since last read' }
  }
  if (hasProtectedChapterContent(chapter.content)) {
    return { status: 409, error: 'Chapter contains protected mentions or comments' }
  }
  const owner = await prisma.user.findUnique({
    where: { id: auth.userId }, select: { familyId: true },
  })
  if (!owner) return { status: 401, error: 'Unauthorized' }

  const proposal = await prisma.chapterProposal.create({
    data: {
      chapterId, authorId: auth.userId, familyId: owner.familyId,
      title, content: content as Prisma.InputJsonValue,
      expectedUpdatedAt: new Date(expectedUpdatedAt),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
    select: { id: true },
  })
  return { status: 201, proposalId: proposal.id }
}
