import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

/** Session-only listing. Never accepts OAuth bearer tokens. */
export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request)
  if (!userId) return json({ error: 'Nicht autorisiert' }, 401)

  const proposals = await prisma.chapterProposal.findMany({
    where: {
      authorId: userId,
      status: 'PENDING',
      chapter: { project: { userId } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      expiresAt: true,
      expectedUpdatedAt: true,
      chapter: {
        select: {
          id: true,
          title: true,
          content: true,
          updatedAt: true,
          project: { select: { id: true, title: true } },
        },
      },
    },
  })

  return json({
    proposals: proposals.map((proposal) => ({
      ...proposal,
      canApply: proposal.expiresAt > new Date() &&
        proposal.chapter.updatedAt.getTime() === proposal.expectedUpdatedAt.getTime(),
    })),
  })
}
