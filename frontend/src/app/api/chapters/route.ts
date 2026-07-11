import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/chapters?projectId=xxx&page=1&limit=50 - Kapitel eines Projekts abrufen (ohne content, paginiert)
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const [chapters, total] = await Promise.all([
      prisma.chapter.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          order: true,
          wordCount: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
          notes: true,
          // content bewusst weggelassen
        }
      }),
      prisma.chapter.count({ where: { projectId } })
    ])

    return NextResponse.json({
      chapters,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Error fetching chapters:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kapitel' }, { status: 500 })
  }
}

// POST /api/chapters - Neues Kapitel erstellen
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { title, projectId, content } = body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const lastChapter = await prisma.chapter.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' }
    })

    const chapter = await prisma.chapter.create({
      data: {
        title: title || 'Neues Kapitel',
        projectId,
        content: content || {},
        order: (lastChapter?.order || 0) + 1,
        wordCount: 0
      }
    })

    return NextResponse.json(chapter, { status: 201 })
  } catch (error) {
    console.error('Error creating chapter:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kapitels' }, { status: 500 })
  }
}