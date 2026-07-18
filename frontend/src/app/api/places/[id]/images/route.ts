import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// POST /api/places/[id]/images - Bild zu einem Ort hinzufügen (nur Autor)
export async function POST(
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

    const place = await prisma.place.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }
    if (place.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { url } = body
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL fehlt' }, { status: 400 })
    }

    const image = await prisma.placeImage.create({
      data: {
        placeId: params.id,
        familyId: context.familyId,
        authorId: context.userId,
        url,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/places/[id]/images', userId })
    return NextResponse.json({ error: 'Fehler beim Hinzufügen des Bildes' }, { status: 500 })
  }
}
