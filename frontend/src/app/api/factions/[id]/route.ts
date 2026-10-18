import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility } from '@/lib/visibility'
import { deleteRelationsForEntity, ContinuityDependencyError } from '@/lib/relations'

// PUT /api/factions/[id] - Fraktion aktualisieren (nur Autor)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const faction = await prisma.faction.findFirst({
      where: { id: resolvedParams.id, familyId: context.familyId },
    })
    if (!faction) {
      return NextResponse.json({ error: 'Fraktion nicht gefunden' }, { status: 404 })
    }
    if (faction.universeId) return NextResponse.json({ error: 'Gemeinsamer Eintrag: Bitte im Universum mit Versionsschutz bearbeiten. Gemeinsame Einträge werden hier nicht gelöscht.' }, { status: 409 })
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

    const updated = await prisma.faction.update({ where: { id: resolvedParams.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ContinuityDependencyError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2003')) return NextResponse.json({ error: 'Eintrag wird von zeitlichen Aussagen oder gemeinsamen Verwendungen benötigt. Zuerst diese Zuordnungen lösen.' }, { status: 409 })
    logger.error(error, { route: 'PUT /api/factions/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/factions/[id] - Fraktion löschen (Autor oder Familien-OWNER)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const faction = await prisma.faction.findFirst({
      where: { id: resolvedParams.id, familyId: context.familyId },
    })
    if (!faction) {
      return NextResponse.json({ error: 'Fraktion nicht gefunden' }, { status: 404 })
    }
    if (faction.universeId) return NextResponse.json({ error: 'Gemeinsamer Eintrag: Bitte im Universum mit Versionsschutz bearbeiten. Gemeinsame Einträge werden hier nicht gelöscht.' }, { status: 409 })
    if (faction.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.$transaction(async tx => {
      await deleteRelationsForEntity(tx, 'FACTION', resolvedParams.id)
      await tx.faction.delete({ where: { id: resolvedParams.id } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ContinuityDependencyError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2003')) return NextResponse.json({ error: 'Eintrag wird von zeitlichen Aussagen oder gemeinsamen Verwendungen benötigt. Zuerst diese Zuordnungen lösen.' }, { status: 409 })
    logger.error(error, { route: 'DELETE /api/factions/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
