import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

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
        where: { projectId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(places)
    }

    const places = await prisma.place.findMany({
      where: { familyId: context.familyId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
      orderBy: { createdAt: 'desc' },
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
    const { name, description, location, climate, importance, projectId, visibility } = body

    if (visibility !== undefined && visibility !== 'PRIVATE' && visibility !== 'FAMILY') {
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

    const place = await prisma.place.create({
      data: {
        name: name || 'Neuer Ort',
        description: description || '',
        location: location || '',
        climate: climate || '',
        importance: importance || '',
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ortes' }, { status: 500 })
  }
}
