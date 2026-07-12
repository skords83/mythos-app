import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { htmlToText, buildSnippet } from '@/lib/text'
import { logger } from '@/lib/logger'

interface SearchResult {
  id: string
  title: string
  snippet: string
  chapterId?: string
}

const MAX_RESULTS_PER_TYPE = 8

// GET /api/search?projectId=xxx&q=yyy - Volltextsuche über Kapitel/Charaktere/Orte/Notizen eines Projekts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const q = (searchParams.get('q') || '').trim()

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 })
    }

    if (q.length < 2) {
      return NextResponse.json({ chapters: [], characters: [], places: [], notes: [] })
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const [characterMatches, placeMatches, noteMatches, allChapters] = await Promise.all([
      prisma.character.findMany({
        where: {
          projectId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { motivation: { contains: q, mode: 'insensitive' } },
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, name: true, description: true, motivation: true }
      }),
      prisma.place.findMany({
        where: {
          projectId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
            { climate: { contains: q, mode: 'insensitive' } },
            { importance: { contains: q, mode: 'insensitive' } },
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, name: true, description: true }
      }),
      prisma.note.findMany({
        where: {
          chapter: { projectId },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, title: true, content: true, chapterId: true }
      }),
      prisma.chapter.findMany({
        where: { projectId },
        select: { id: true, title: true, content: true }
      })
    ])

    const characters: SearchResult[] = characterMatches.map(c => ({
      id: c.id,
      title: c.name,
      snippet: buildSnippet([c.description, c.motivation].filter(Boolean).join(' — ') || c.name, q)
    }))

    const places: SearchResult[] = placeMatches.map(p => ({
      id: p.id,
      title: p.name,
      snippet: buildSnippet(p.description || p.name, q)
    }))

    const notes: SearchResult[] = noteMatches.map(n => ({
      id: n.id,
      title: n.title,
      snippet: buildSnippet(n.content, q),
      chapterId: n.chapterId
    }))

    const lowerQ = q.toLowerCase()
    const chapters: SearchResult[] = allChapters
      .map(ch => {
        const plainText = htmlToText(typeof ch.content === 'string' ? ch.content : '')
        const titleMatch = ch.title.toLowerCase().includes(lowerQ)
        const contentMatch = plainText.toLowerCase().includes(lowerQ)
        if (!titleMatch && !contentMatch) return null
        return {
          id: ch.id,
          title: ch.title,
          snippet: buildSnippet(contentMatch ? plainText : ch.title, q)
        }
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, MAX_RESULTS_PER_TYPE)

    return NextResponse.json({ chapters, characters, places, notes })
  } catch (error) {
    logger.error(error, { route: 'GET /api/search', userId })
    return NextResponse.json({ error: 'Fehler bei der Suche' }, { status: 500 })
  }
}
