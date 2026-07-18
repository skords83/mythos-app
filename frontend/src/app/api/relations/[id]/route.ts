import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// PUT /api/relations/[id] - Relation aktualisieren (relationType/label, nur Autor)
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

    const relation = await prisma.relation.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!relation) {
      return NextResponse.json({ error: 'Relation nicht gefunden' }, { status: 404 })
    }
    if (relation.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { relationType, label } = body

    const updateData: any = {}
    if (relationType !== undefined) updateData.relationType = relationType
    if (label !== undefined) updateData.label = label

    const updated = await prisma.relation.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/relations/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/relations/[id] - Relation löschen (Autor oder Familien-OWNER)
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

    const relation = await prisma.relation.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!relation) {
      return NextResponse.json({ error: 'Relation nicht gefunden' }, { status: 404 })
    }
    if (relation.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.relation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/relations/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
