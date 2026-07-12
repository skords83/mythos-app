import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/chapters/[id] - Einzelnes Kapitel abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      },
      include: {
        notes: true
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(chapter)
  } catch (error) {
    logger.error(error, { route: 'GET /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Kapitels' }, { status: 500 })
  }
}

// PUT /api/chapters/[id] - Kapitel aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, wordCount } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (wordCount !== undefined) updateData.wordCount = wordCount

    const updated = await prisma.chapter.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/chapters/[id] - Kapitel löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    await prisma.chapter.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
