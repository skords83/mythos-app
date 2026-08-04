import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isValidVisibility, visibilityWhere } from '@/lib/visibility'

// GET /api/ideas?projectId=xxx - Ideen eines Projekts, sonst das Familien-Ideenboard
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
    const includeArchived = searchParams.get('includeArchived') === '1'
    const archivedWhere = includeArchived ? {} : { archivedAt: null }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }

      const ideas = await prisma.idea.findMany({
        where: { projectId, OR: visibilityWhere(context), ...archivedWhere },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(ideas)
    }

    const ideas = await prisma.idea.findMany({
      where: { familyId: context.familyId, OR: visibilityWhere(context), ...archivedWhere },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(ideas)
  } catch (error) {
    logger.error(error, { route: 'GET /api/ideas', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Ideenboards' }, { status: 500 })
  }
}

// POST /api/ideas - Neue Idee erstellen (projektgebunden oder als Familien-Idee)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { title, content, tags, projectId, visibility } = body

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

    const idea = await prisma.idea.create({
      data: {
        title: title || 'Neue Idee',
        content: content || '',
        tags: Array.isArray(tags) ? tags : [],
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/ideas', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen der Idee' }, { status: 500 })
  }
}
