import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/characters?projectId=xxx - Charaktere eines Projekts, sonst die Familien-Bibliothek
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

      const characters = await prisma.character.findMany({
        where: { projectId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(characters)
    }

    const characters = await prisma.character.findMany({
      where: { familyId: context.familyId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(characters)
  } catch (error) {
    logger.error(error, { route: 'GET /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Charaktere' }, { status: 500 })
  }
}

// POST /api/characters - Neuen Charakter erstellen (projektgebunden oder als Familien-Bibliothekseintrag)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { name, description, motivation, projectId, visibility } = body

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

    const character = await prisma.character.create({
      data: {
        name: name || 'Neuer Charakter',
        description: description || '',
        motivation: motivation || '',
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Charakters' }, { status: 500 })
  }
}
