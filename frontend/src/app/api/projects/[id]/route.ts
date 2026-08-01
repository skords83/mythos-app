import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/projects/[id] - Einzelnes Projekt abrufen
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

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId },
      include: {
        _count: {
          select: { chapters: true, characters: true }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    logger.error(error, { route: 'GET /api/projects/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Projekts' }, { status: 500 })
  }
}

// PUT /api/projects/[id] - Projekt aktualisieren
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

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

const body = await request.json()
  const { title, description, wordGoal, coverImage, wordCountBaseline, wordCountBaselineDate } = body

  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (wordGoal !== undefined) updateData.wordGoal = wordGoal
  if (coverImage !== undefined) updateData.coverImage = coverImage
  if (wordCountBaseline !== undefined) updateData.wordCountBaseline = wordCountBaseline
  if (wordCountBaselineDate !== undefined) updateData.wordCountBaselineDate = wordCountBaselineDate

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(project)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/projects/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - Projekt löschen
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

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    await prisma.project.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/projects/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
