import { checkUniverseEdge } from '@/lib/universe-relations'
import { runStoryAction } from '@/lib/story-service'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// PUT /api/relations/[id] - Relation aktualisieren (relationType/label, nur Autor)
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

    const relation = await prisma.relation.findFirst({
      where: { id: resolvedParams.id, familyId: context.familyId },
    })
    if (!relation) {
      return NextResponse.json({ error: 'Relation nicht gefunden' }, { status: 404 })
    }
    if (relation.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { relationType, label } = body
    if (await checkUniverseEdge(prisma, context, relation)) {
      if (!body.expectedUpdatedAt) return NextResponse.json({ error: 'Gemeinsame Beziehung: expectedUpdatedAt erforderlich.' }, { status: 409 })
      const result = await runStoryAction(context, 'update_relation', { id: relation.id, expectedUpdatedAt: body.expectedUpdatedAt, ...(relationType !== undefined ? { relationType } : {}), ...(label !== undefined ? { label } : {}) })
      return NextResponse.json(result.data ?? { error: result.error }, { status: result.status })
    }

    const updateData: any = {}
    if (relationType !== undefined) updateData.relationType = relationType
    if (label !== undefined) updateData.label = label

    const updated = await prisma.relation.update({ where: { id: resolvedParams.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/relations/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/relations/[id] - Relation löschen (Autor oder Familien-OWNER)
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

    const relation = await prisma.relation.findFirst({
      where: { id: resolvedParams.id, familyId: context.familyId },
    })
    if (!relation) {
      return NextResponse.json({ error: 'Relation nicht gefunden' }, { status: 404 })
    }
    if (relation.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    if (await checkUniverseEdge(prisma, context, relation)) {
      const expectedUpdatedAt = request.nextUrl.searchParams.get('expectedUpdatedAt')
      if (!expectedUpdatedAt) return NextResponse.json({ error: 'Gemeinsame Beziehung: expectedUpdatedAt erforderlich.' }, { status: 409 })
      const result = await runStoryAction(context, 'delete_relation', { id: relation.id, expectedUpdatedAt })
      return NextResponse.json(result.data ?? { error: result.error }, { status: result.status })
    }
    await prisma.relation.delete({ where: { id: resolvedParams.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/relations/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
