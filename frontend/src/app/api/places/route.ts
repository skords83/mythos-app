import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isChildVisibilityAllowed, isValidVisibility, visibilityWhere } from '@/lib/visibility'

// GET /api/places?projectId=xxx - Orte eines Projekts, sonst die Familien-Bibliothek
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }

      const places = await prisma.place.findMany({
        where: { projectId, OR: visibilityWhere(context) },
        orderBy: { createdAt: 'desc' },
        include: { images: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json(places)
    }

    const places = await prisma.place.findMany({
      where: { familyId: context.familyId, OR: visibilityWhere(context) },
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json(places)
  } catch (error) {
    logger.error(error, { route: 'GET /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Orte' }, { status: 500 })
  }
}

// POST /api/places - Neuen Ort erstellen (projektgebunden oder als Familien-Bibliothekseintrag)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { name, description, location, climate, importance, history, politics, sensoryDetails, projectId, visibility, parentId } = body

    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }
    }

    const effectiveVisibility = visibility || 'PRIVATE'

    if (parentId) {
      const parent = await prisma.place.findFirst({
        where: { id: parentId, familyId: context.familyId },
      })
      if (!parent) {
        return NextResponse.json({ error: 'Übergeordneter Ort nicht gefunden' }, { status: 404 })
      }
      if (!isChildVisibilityAllowed(parent.visibility, effectiveVisibility)) {
        return NextResponse.json(
          { error: 'Ein Ort unter einem privaten übergeordneten Ort kann nicht auf Familie sichtbar sein' },
          { status: 400 }
        )
      }
    }

    const place = await prisma.place.create({
      data: {
        name: name || 'Neuer Ort',
        description: description || '',
        location: location || '',
        climate: climate || '',
        importance: importance || '',
        history: history || '',
        politics: politics || '',
        sensoryDetails: sensoryDetails || '',
        visibility: effectiveVisibility,
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
        parentId: parentId || null,
      },
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ortes' }, { status: 500 })
  }
}
