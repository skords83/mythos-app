import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/places?projectId=xxx - Orte eines Projekts abrufen
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 })
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const places = await prisma.place.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(places)
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Orte' }, { status: 500 })
  }
}

// POST /api/places - Neuen Ort erstellen
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, location, climate, importance, projectId } = body

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const place = await prisma.place.create({
      data: {
        name: name || 'Neuer Ort',
        description: description || '',
        location: location || '',
        climate: climate || '',
        importance: importance || '',
        projectId
      }
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    console.error('Error creating place:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ortes' }, { status: 500 })
  }
}
