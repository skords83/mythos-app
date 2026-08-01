import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility, visibilityWhere } from '@/lib/visibility'

// GET /api/scenes?chapterId=xxx - Szenen eines Kapitels
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

    const scenes = await prisma.scene.findMany({
      where: { chapterId, OR: visibilityWhere(context) },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(scenes)
  } catch (error) {
    logger.error(error, { route: 'GET /api/scenes', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Szenen' }, { status: 500 })
  }
}

// POST /api/scenes - Neue Szene erstellen
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { chapterId, name, description, outline, visibility, tags } = body

    if (!chapterId) {
      return NextResponse.json({ error: 'Kapitel-ID erforderlich' }, { status: 400 })
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

    const order = await prisma.scene.count({ where: { chapterId } })

    const scene = await prisma.scene.create({
      data: {
        name: name || 'Neue Szene',
        description: description || '',
        outline: outline || '',
        tags: Array.isArray(tags) ? tags : [],
        order,
        visibility: visibility || 'PRIVATE',
        chapterId,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(scene, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/scenes', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen der Szene' }, { status: 500 })
  }
}
