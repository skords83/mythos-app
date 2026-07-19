import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility, visibilityWhere } from '@/lib/visibility'

export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')
    if (!chapterId) {
      return NextResponse.json({ error: 'Kapitel-ID erforderlich' }, { status: 400 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, project: { user: { familyId: context.familyId } } },
    })
    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const comments = await prisma.comment.findMany({
      where: { chapterId, OR: visibilityWhere(context) },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(comments)
  } catch (error) {
    logger.error(error, { route: 'GET /api/comments', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Kommentare' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { chapterId, content, visibility } = body

    if (!chapterId) {
      return NextResponse.json({ error: 'Kapitel-ID erforderlich' }, { status: 400 })
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Kommentartext erforderlich' }, { status: 400 })
    }
    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, project: { user: { familyId: context.familyId } } },
    })
    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        visibility: visibility || 'PRIVATE',
        chapterId,
        familyId: context.familyId,
        authorId: context.userId,
      },
      include: { author: { select: { name: true } } },
    })
    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/comments', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kommentars' }, { status: 500 })
  }
}
