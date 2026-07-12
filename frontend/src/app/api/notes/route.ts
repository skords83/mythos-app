import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/notes?chapterId=xxx - Notizen eines Kapitels abrufen
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')

    if (!chapterId) {
      return NextResponse.json({ error: 'Kapitel-ID erforderlich' }, { status: 400 })
    }

    // Verify chapter belongs to user's project
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: chapterId,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const notes = await prisma.note.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(notes)
  } catch (error) {
    logger.error(error, { route: 'GET /api/notes', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Notizen' }, { status: 500 })
  }
}

// POST /api/notes - Neue Notiz erstellen
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, chapterId } = body

    // Verify chapter belongs to user's project
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: chapterId,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const note = await prisma.note.create({
      data: {
        title: title || 'Neue Notiz',
        content: content || '',
        chapterId
      }
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/notes', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen der Notiz' }, { status: 500 })
  }
}
