import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { visibilityWhere } from '@/lib/visibility'
import { htmlToText, buildSnippet } from '@/lib/text'
import { logger } from '@/lib/logger'

interface SearchResult {
  id: string
  title: string
  snippet: string
  chapterId?: string
}

const MAX_RESULTS_PER_TYPE = 8

/** Escapes LIKE/ILIKE metacharacters (`\`, `%`, `_`) so a literal search term
 * can't be widened into an unintended wildcard pattern. Order matters: the
 * escape character itself must be escaped first. */
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

const EMPTY_SEARCH_RESULTS = {
  chapters: [], characters: [], places: [], notes: [],
  items: [], factions: [], scenes: [], timelineEvents: [], loreEntries: [], ideas: [],
}

// GET /api/search?projectId=xxx&q=yyy - Volltextsuche über alle Entitäten eines Projekts
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
    const q = (searchParams.get('q') || '').trim()

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 })
    }

    if (q.length < 2) {
      return NextResponse.json(EMPTY_SEARCH_RESULTS)
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, user: { familyId: context.familyId } }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const visible = { OR: visibilityWhere(context) }

    const [
      characterMatches,
      placeMatches,
      noteMatches,
      allChapters,
      itemMatches,
      factionMatches,
      sceneMatches,
      timelineEventMatches,
      loreEntryMatches,
      ideaMatches,
    ] = await Promise.all([
      prisma.character.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { appearance: { contains: q, mode: 'insensitive' } },
                { personality: { contains: q, mode: 'insensitive' } },
                { backstory: { contains: q, mode: 'insensitive' } },
                { motivation: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, name: true, appearance: true, personality: true, backstory: true, motivation: true }
      }),
      prisma.place.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { location: { contains: q, mode: 'insensitive' } },
                { climate: { contains: q, mode: 'insensitive' } },
                { importance: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
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
      // Chapter.content is a Json column holding the editor's HTML string.
      // Prisma's JSON filters (`string_contains`) have no `mode: 'insensitive'`
      // option on Postgres, so a plain Prisma where-clause can't replicate the
      // case-insensitive match this route needs. Raw SQL with ILIKE sidesteps
      // that gap and, unlike the previous full-project findMany, lets Postgres
      // do the filtering + limiting instead of shipping every chapter's full
      // content to the app server on every keystroke.
      prisma.$queryRaw<{ id: string; title: string; content: unknown }[]>(
        Prisma.sql`
          SELECT id, title, content
          FROM "Chapter"
          WHERE "projectId" = ${projectId}
            AND (
              title ILIKE ${'%' + escapeLikePattern(q) + '%'}
              OR content::text ILIKE ${'%' + escapeLikePattern(q) + '%'}
            )
          LIMIT ${MAX_RESULTS_PER_TYPE}
        `
      ),
      prisma.item.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { origin: { contains: q, mode: 'insensitive' } },
                { significance: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, name: true, description: true }
      }),
      prisma.faction.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { goal: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, name: true, description: true }
      }),
      prisma.scene.findMany({
        where: {
          chapter: { projectId },
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, name: true, description: true, chapterId: true }
      }),
      prisma.timelineEvent.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { date: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, title: true, description: true, date: true }
      }),
      prisma.loreEntry.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, title: true, content: true }
      }),
      prisma.idea.findMany({
        where: {
          projectId,
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ]
            },
            visible,
          ]
        },
        take: MAX_RESULTS_PER_TYPE,
        select: { id: true, title: true, content: true }
      }),
    ])

    const characters: SearchResult[] = characterMatches.map(c => ({
      id: c.id,
      title: c.name,
      snippet: buildSnippet([c.appearance, c.personality, c.backstory, c.motivation].filter(Boolean).join(' — ') || c.name, q)
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

    const items: SearchResult[] = itemMatches.map(i => ({
      id: i.id,
      title: i.name,
      snippet: buildSnippet(i.description || i.name, q)
    }))

    const factions: SearchResult[] = factionMatches.map(f => ({
      id: f.id,
      title: f.name,
      snippet: buildSnippet(f.description || f.name, q)
    }))

    const scenes: SearchResult[] = sceneMatches.map(s => ({
      id: s.id,
      title: s.name,
      snippet: buildSnippet(s.description || s.name, q),
      chapterId: s.chapterId
    }))

    const timelineEvents: SearchResult[] = timelineEventMatches.map(t => ({
      id: t.id,
      title: t.title,
      snippet: buildSnippet(t.description || t.date || t.title, q)
    }))

    const loreEntries: SearchResult[] = loreEntryMatches.map(l => ({
      id: l.id,
      title: l.title,
      snippet: buildSnippet(l.content || l.title, q)
    }))

    const ideas: SearchResult[] = ideaMatches.map(i => ({
      id: i.id,
      title: i.title,
      snippet: buildSnippet(i.content || i.title, q)
    }))

    return NextResponse.json({ chapters, characters, places, notes, items, factions, scenes, timelineEvents, loreEntries, ideas })
  } catch (error) {
    logger.error(error, { route: 'GET /api/search', userId })
    return NextResponse.json({ error: 'Fehler bei der Suche' }, { status: 500 })
  }
}
