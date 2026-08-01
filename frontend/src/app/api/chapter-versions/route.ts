import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/chapter-versions?chapterId=xxx - Alternative Entwürfe eines Kapitels
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

    const versions = await prisma.chapterVersion.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(versions)
  } catch (error) {
    logger.error(error, { route: 'GET /api/chapter-versions', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Entwürfe' }, { status: 500 })
  }
}

// POST /api/chapter-versions - Neuen Entwurf erstellen
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { chapterId, name, content, wordCount } = body

    if (!chapterId) {
      return NextResponse.json({ error: 'Kapitel-ID erforderlich' }, { status: 400 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, project: { user: { familyId: context.familyId } } },
    })
    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const version = await prisma.chapterVersion.create({
      data: {
        name: name || 'Neuer Entwurf',
        content: content ?? null,
        wordCount: wordCount || 0,
        chapterId,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/chapter-versions', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Entwurfs' }, { status: 500 })
  }
}
