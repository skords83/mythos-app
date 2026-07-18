import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility, visibilityWhere } from '@/lib/visibility'

function isValidEventType(value: unknown): value is 'LORE' | 'PLOT' {
  return value === 'LORE' || value === 'PLOT'
}

// GET /api/timeline-events?projectId=xxx - Zeitstrahl eines Projekts, sonst die Familien-Bibliothek
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

      const timelineEvents = await prisma.timelineEvent.findMany({
        where: { projectId, OR: visibilityWhere(context) },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json(timelineEvents)
    }

    const timelineEvents = await prisma.timelineEvent.findMany({
      where: { familyId: context.familyId, OR: visibilityWhere(context) },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(timelineEvents)
  } catch (error) {
    logger.error(error, { route: 'GET /api/timeline-events', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Zeitstrahls' }, { status: 500 })
  }
}

// POST /api/timeline-events - Neues Ereignis erstellen (projektgebunden oder als Familien-Bibliothekseintrag)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { title, description, date, type, projectId, visibility } = body

    if (visibility !== undefined && !isValidVisibility(visibility)) {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    if (type !== undefined && !isValidEventType(type)) {
      return NextResponse.json({ error: 'Typ muss LORE oder PLOT sein' }, { status: 400 })
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }
    }

    const scopeWhere = projectId ? { projectId } : { familyId: context.familyId, projectId: null }
    const order = await prisma.timelineEvent.count({ where: scopeWhere })

    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        title: title || 'Neues Ereignis',
        description: description || '',
        date: date || '',
        order,
        type: type || 'PLOT',
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(timelineEvent, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/timeline-events', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ereignisses' }, { status: 500 })
  }
}
