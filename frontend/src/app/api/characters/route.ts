import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/characters?projectId=xxx - Charaktere eines Projekts abrufen
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
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

    const characters = await prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(characters)
  } catch (error) {
    logger.error(error, { route: 'GET /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Charaktere' }, { status: 500 })
  }
}

// POST /api/characters - Neuen Charakter erstellen
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { name, role, description, motivation, projectId } = body

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const character = await prisma.character.create({
      data: {
        name: name || 'Neuer Charakter',
        description: description || '',
        motivation: motivation || '',
        projectId
      }
    })

    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Charakters' }, { status: 500 })
  }
}
