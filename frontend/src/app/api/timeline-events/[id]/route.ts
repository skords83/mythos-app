import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility } from '@/lib/visibility'
import { deleteRelationsForEntity } from '@/lib/relations'

function isValidEventType(value: unknown): value is 'LORE' | 'PLOT' {
  return value === 'LORE' || value === 'PLOT'
}

// PUT /api/timeline-events/[id] - Ereignis aktualisieren (nur Autor)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const timelineEvent = await prisma.timelineEvent.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!timelineEvent) {
      return NextResponse.json({ error: 'Ereignis nicht gefunden' }, { status: 404 })
    }
    if (timelineEvent.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, date, order, type, visibility } = body

    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    if (type !== undefined && !isValidEventType(type)) {
      return NextResponse.json({ error: 'Typ muss LORE oder PLOT sein' }, { status: 400 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (date !== undefined) updateData.date = date
    if (order !== undefined) updateData.order = order
    if (type !== undefined) updateData.type = type
    if (visibility !== undefined) updateData.visibility = visibility

    const updated = await prisma.timelineEvent.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/timeline-events/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/timeline-events/[id] - Ereignis löschen (Autor oder Familien-OWNER)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const timelineEvent = await prisma.timelineEvent.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!timelineEvent) {
      return NextResponse.json({ error: 'Ereignis nicht gefunden' }, { status: 404 })
    }
    if (timelineEvent.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await deleteRelationsForEntity(prisma, 'EVENT', params.id)
    await prisma.timelineEvent.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/timeline-events/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
