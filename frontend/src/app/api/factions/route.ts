import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility, visibilityWhere } from '@/lib/visibility'

// GET /api/factions?projectId=xxx - Fraktionen eines Projekts, sonst die Familien-Bibliothek
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

      const factions = await prisma.faction.findMany({
        where: { projectId, OR: visibilityWhere(context) },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(factions)
    }

    const factions = await prisma.faction.findMany({
      where: { familyId: context.familyId, OR: visibilityWhere(context) },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(factions)
  } catch (error) {
    logger.error(error, { route: 'GET /api/factions', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Fraktionen' }, { status: 500 })
  }
}

// POST /api/factions - Neue Fraktion erstellen (projektgebunden oder als Familien-Bibliothekseintrag)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { name, description, goal, projectId, visibility } = body

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

    const faction = await prisma.faction.create({
      data: {
        name: name || 'Neue Fraktion',
        description: description || '',
        goal: goal || '',
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(faction, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/factions', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen der Fraktion' }, { status: 500 })
  }
}
