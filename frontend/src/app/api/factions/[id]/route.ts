import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility } from '@/lib/visibility'
import { deleteRelationsForEntity } from '@/lib/relations'

// PUT /api/factions/[id] - Fraktion aktualisieren (nur Autor)
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

    const faction = await prisma.faction.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!faction) {
      return NextResponse.json({ error: 'Fraktion nicht gefunden' }, { status: 404 })
    }
    if (faction.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, goal, visibility } = body

    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (goal !== undefined) updateData.goal = goal
    if (visibility !== undefined) updateData.visibility = visibility

    const updated = await prisma.faction.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/factions/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/factions/[id] - Fraktion löschen (Autor oder Familien-OWNER)
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

    const faction = await prisma.faction.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!faction) {
      return NextResponse.json({ error: 'Fraktion nicht gefunden' }, { status: 404 })
    }
    if (faction.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await deleteRelationsForEntity(prisma, 'FACTION', params.id)
    await prisma.faction.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/factions/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
