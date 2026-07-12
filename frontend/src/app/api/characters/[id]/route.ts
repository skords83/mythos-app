import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// PUT /api/characters/[id] - Charakter aktualisieren (nur Autor)
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

    const character = await prisma.character.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!character) {
      return NextResponse.json({ error: 'Charakter nicht gefunden' }, { status: 404 })
    }
    if (character.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, motivation, visibility } = body

    if (visibility !== undefined && visibility !== 'PRIVATE' && visibility !== 'FAMILY') {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (motivation !== undefined) updateData.motivation = motivation
    if (visibility !== undefined) updateData.visibility = visibility

    const updated = await prisma.character.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/characters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/characters/[id] - Charakter löschen (Autor oder Familien-OWNER)
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

    const character = await prisma.character.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!character) {
      return NextResponse.json({ error: 'Charakter nicht gefunden' }, { status: 404 })
    }
    if (character.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.character.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/characters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
