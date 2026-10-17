import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/chapters/[id] - Einzelnes Kapitel abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: resolvedParams.id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: resolvedParams.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, wordCount, expectedUpdatedAt } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (wordCount !== undefined) updateData.wordCount = wordCount

    if (expectedUpdatedAt !== undefined) {
      if (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(expectedUpdatedAt))) {
        return NextResponse.json({ error: 'Ungültiger Versionsstand' }, { status: 400 })
      }
      const updated = await prisma.$transaction(async tx => {
        const result = await tx.chapter.updateMany({
          where: { id: resolvedParams.id, project: { userId: userId! }, updatedAt: new Date(expectedUpdatedAt) },
          data: updateData,
        })
        return result.count ? tx.chapter.findUnique({ where: { id: resolvedParams.id } }) : null
      })
      if (!updated) return NextResponse.json({ error: 'Kapitel wurde zwischenzeitlich geändert. Dein Text bleibt lokal erhalten. Bitte neu laden.' }, { status: 409 })
      return NextResponse.json(updated)
    }
    const updated = await prisma.chapter.update({
      where: { id: resolvedParams.id }, data: updateData,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: resolvedParams.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    await prisma.chapter.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
