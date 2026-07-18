import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  cascadePrivateToPlaceDescendants,
  isChildVisibilityAllowed,
  isValidVisibility,
  visibilityWhere,
} from '@/lib/visibility'
import { deleteRelationsForEntity } from '@/lib/relations'

// GET /api/places/[id] - Einzelnen Ort abrufen
export async function GET(
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
      where: {
        id: params.id,
        familyId: context.familyId,
        OR: visibilityWhere(context),
      },
      include: { images: { orderBy: { createdAt: 'asc' } } },
    })
    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(place)
  } catch (error) {
    logger.error(error, { route: 'GET /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Ortes' }, { status: 500 })
  }
}

// PUT /api/places/[id] - Ort aktualisieren (nur Autor)
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
    const { name, description, location, climate, importance, visibility, parentId } = body

    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const nextVisibility = visibility !== undefined ? visibility : place.visibility
    let parentForVisibilityCheck: { visibility: typeof place.visibility } | null = null

    if (parentId !== undefined && parentId !== null) {
      if (parentId === params.id) {
        return NextResponse.json({ error: 'Ein Ort kann nicht sein eigener übergeordneter Ort sein' }, { status: 400 })
      }
      const parent = await prisma.place.findFirst({
        where: { id: parentId, familyId: context.familyId },
      })
      if (!parent) {
        return NextResponse.json({ error: 'Übergeordneter Ort nicht gefunden' }, { status: 404 })
      }

      let ancestor: { id: string; parentId: string | null } | null = parent
      while (ancestor) {
        if (ancestor.id === params.id) {
          return NextResponse.json({ error: 'Diese Zuordnung würde einen Kreis in der Orts-Hierarchie erzeugen' }, { status: 400 })
        }
        ancestor = ancestor.parentId
          ? await prisma.place.findUnique({ where: { id: ancestor.parentId }, select: { id: true, parentId: true } })
          : null
      }
      parentForVisibilityCheck = parent
    } else if (parentId === undefined && place.parentId) {
      // parent unchanged — still need it to validate a visibility change against the existing parent
      parentForVisibilityCheck = await prisma.place.findFirst({
        where: { id: place.parentId, familyId: context.familyId },
      })
    }

    if (parentForVisibilityCheck && !isChildVisibilityAllowed(parentForVisibilityCheck.visibility, nextVisibility)) {
      return NextResponse.json(
        { error: 'Ein Ort unter einem privaten übergeordneten Ort kann nicht auf Familie sichtbar sein' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (climate !== undefined) updateData.climate = climate
    if (importance !== undefined) updateData.importance = importance
    if (visibility !== undefined) updateData.visibility = visibility
    if (parentId !== undefined) updateData.parentId = parentId

    const updated = await prisma.place.update({
      where: { id: params.id },
      data: updateData,
      include: { images: { orderBy: { createdAt: 'asc' } } },
    })

    if (place.visibility === 'FAMILY' && nextVisibility === 'PRIVATE') {
      await cascadePrivateToPlaceDescendants(prisma, params.id, context.familyId)
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/places/[id] - Ort löschen (Autor oder Familien-OWNER)
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

    const place = await prisma.place.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }
    if (place.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await deleteRelationsForEntity(prisma, 'PLACE', params.id)
    await prisma.place.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
