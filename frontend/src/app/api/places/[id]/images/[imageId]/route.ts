import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// DELETE /api/places/[id]/images/[imageId] - Bild entfernen (nur Autor)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const image = await prisma.placeImage.findFirst({
      where: { id: params.imageId, placeId: params.id, familyId: context.familyId },
    })
    if (!image) {
      return NextResponse.json({ error: 'Bild nicht gefunden' }, { status: 404 })
    }
    if (image.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.placeImage.delete({ where: { id: params.imageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/places/[id]/images/[imageId]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen des Bildes' }, { status: 500 })
  }
}
