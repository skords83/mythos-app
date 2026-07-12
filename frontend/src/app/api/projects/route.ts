import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/projects?page=1&limit=20 - Projekte des eingeloggten Benutzers (paginiert)
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { chapters: true, characters: true }
          }
        }
      }),
      prisma.project.count({ where: { userId } })
    ])

    return NextResponse.json({
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    logger.error(error, { route: 'GET /api/projects', userId })
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST /api/projects - Neues Projekt erstellen
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, wordGoal } = body

    // Create project with first chapter
    const project = await prisma.project.create({
      data: {
        title: title || 'Neues Projekt',
        description: description || '',
        wordGoal: wordGoal || 500,
        userId,
        chapters: {
          create: {
            title: 'Kapitel 1',
            order: 0,
          }
        }
      },
      include: {
        _count: {
          select: { chapters: true, characters: true }
        }
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/projects', userId })
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
