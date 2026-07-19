import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility } from '@/lib/visibility'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const comment = await prisma.comment.findFirst({ where: { id: params.id, familyId: context.familyId } })
    if (!comment) {
      return NextResponse.json({ error: 'Kommentar nicht gefunden' }, { status: 404 })
    }
    if (comment.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { content, visibility, resolved } = body
    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }
    if (content !== undefined && !content.trim()) {
      return NextResponse.json({ error: 'Kommentartext erforderlich' }, { status: 400 })
    }

    const updateData: any = {}
    if (content !== undefined) updateData.content = content
    if (visibility !== undefined) updateData.visibility = visibility
    if (resolved !== undefined) updateData.resolved = resolved

    const updated = await prisma.comment.update({
      where: { id: params.id },
      data: updateData,
      include: { author: { select: { name: true } } },
    })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/comments/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const comment = await prisma.comment.findFirst({ where: { id: params.id, familyId: context.familyId } })
    if (!comment) {
      return NextResponse.json({ error: 'Kommentar nicht gefunden' }, { status: 404 })
    }
    if (comment.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.comment.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/comments/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
