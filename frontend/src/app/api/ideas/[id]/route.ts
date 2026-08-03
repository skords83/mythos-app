import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility } from '@/lib/visibility'

// PUT /api/ideas/[id] - Idee aktualisieren (nur Autor)
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

    const idea = await prisma.idea.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!idea) {
      return NextResponse.json({ error: 'Idee nicht gefunden' }, { status: 404 })
    }
    if (idea.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, tags, visibility } = body

    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : []
    if (visibility !== undefined) updateData.visibility = visibility

    const updated = await prisma.idea.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/ideas/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/ideas/[id] - Idee löschen (Autor oder Familien-OWNER)
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

    const idea = await prisma.idea.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!idea) {
      return NextResponse.json({ error: 'Idee nicht gefunden' }, { status: 404 })
    }
    if (idea.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.idea.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/ideas/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
