import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { bulkNameLinks, chapterHtml, replaceChapterHtml } from '@/lib/bulkNameLinks'
import type { NameCandidate } from '@/lib/nameRecognition'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    const body = await request.json()
    const { projectId, chapterId, action, kinds } = body
    if (typeof projectId !== 'string' || !['preview', 'apply'].includes(action) || !Array.isArray(kinds) || !kinds.length || kinds.some(k => !['CHARACTER', 'PLACE'].includes(k)) || (chapterId !== undefined && typeof chapterId !== 'string')) {
      return NextResponse.json({ error: 'Ungültige Auswahl' }, { status: 400 })
    }
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: auth.userId } })
    if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    const loadCandidates = async (db: Pick<typeof prisma, 'character' | 'place' | 'item'>) => {
      const rows = await Promise.all([db.character.findMany({ where: { projectId } }), db.place.findMany({ where: { projectId } }), db.item.findMany({ where: { projectId } })])
      return rows.flatMap((entities, i) => entities.flatMap(e => [e.name, ...e.aliases].map(name => ({ id: e.id, name, label: e.name, kind: (['CHARACTER', 'PLACE', 'ITEM'] as const)[i] })))).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) as NameCandidate[]
    }
    const fingerprint = (candidates: NameCandidate[]) => createHash('sha256').update(JSON.stringify(candidates)).digest('hex')
    if (action === 'preview') {
      const candidates = await loadCandidates(prisma)
      const chapters = await prisma.chapter.findMany({ where: { projectId, ...(chapterId ? { id: chapterId } : {}) }, orderBy: { order: 'asc' } })
      const previews = chapters.map(chapter => {
        try {
          const result = bulkNameLinks(chapterHtml(chapter.content), candidates, kinds)
          return { id: chapter.id, title: chapter.title, updatedAt: chapter.updatedAt, groups: result.groups, ambiguous: result.ambiguous }
        } catch { return { id: chapter.id, title: chapter.title, error: 'Kapitelformat konnte nicht verarbeitet werden' } }
      })
      return NextResponse.json({ fingerprint: fingerprint(candidates), chapters: previews })
    }
    if (!chapterId || typeof body.updatedAt !== 'string' || !Number.isFinite(Date.parse(body.updatedAt)) || typeof body.fingerprint !== 'string' || !Array.isArray(body.selected) || body.selected.some((s: unknown) => typeof s !== 'string')) {
      return NextResponse.json({ error: 'Ungültige Vorschau' }, { status: 400 })
    }
    // One transaction per chapter: compare-and-swap plus restoration version.
    // Serializable isolation also protects against changes to the entity catalogue.
    const result = await prisma.$transaction(async tx => {
      const candidates = await loadCandidates(tx)
      if (fingerprint(candidates) !== body.fingerprint) return { status: 'skipped', reason: 'Namen oder Aliase wurden zwischenzeitlich geändert.', added: 0 }
      const chapter = await tx.chapter.findFirst({ where: { id: chapterId, projectId, project: { userId: auth.userId } } })
      if (!chapter || chapter.updatedAt.toISOString() !== body.updatedAt) return { status: 'skipped', reason: 'Kapitel wurde zwischenzeitlich geändert oder gelöscht.', added: 0 }
      const result = bulkNameLinks(chapterHtml(chapter.content), candidates, kinds, body.selected)
      if (!result.added) return { status: 'processed', added: 0, skipped: result.skipped, chapter }
      const update = await tx.chapter.updateMany({ where: { id: chapterId, updatedAt: chapter.updatedAt, project: { userId: auth.userId } }, data: { content: replaceChapterHtml(chapter.content, result.content) as Prisma.InputJsonValue } })
      if (update.count !== 1) throw new Error('Concurrent chapter update')
      await tx.chapterVersion.create({ data: { chapterId, name: `Vor Namen-Verknüpfung ${new Date().toLocaleString('de-DE')}`, content: chapter.content ?? Prisma.JsonNull, wordCount: chapter.wordCount, familyId: auth.familyId, authorId: auth.userId } })
      return { status: 'processed', added: result.added, skipped: result.skipped, chapter: await tx.chapter.findUnique({ where: { id: chapterId } }) }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return NextResponse.json({ status: 'skipped', reason: 'Zwischenzeitliche Änderung. Bitte Vorschau erneuern.', added: 0 })
    logger.error(error, { route: 'POST /api/name-links' })
    return NextResponse.json({ error: 'Kapitel konnte nicht verarbeitet werden. Bitte neu laden und Ergebnis prüfen.' }, { status: 500 })
  }
}
