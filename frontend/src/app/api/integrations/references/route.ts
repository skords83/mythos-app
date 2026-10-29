import { NextRequest, NextResponse } from 'next/server'
import { ChapterWriteConflict, isChapterWriteConflict, nextChapterRevision } from '@/lib/chapter-write-conflict'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, type AuthContext } from '@/lib/auth'
import { bookEntityScope } from '@/lib/universe-scope'
import { visibilityWhere } from '@/lib/visibility'
import { chapterReferences } from '@/lib/chapter-references'

export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
async function inspect(db: Prisma.TransactionClient, context: AuthContext, chapterId: string) {
  const chapter = await db.chapter.findFirst({ where: { id: chapterId, project: { userId: context.userId } } })
  if (!chapter) return null
  const scope = async (kind: 'CHARACTER' | 'PLACE' | 'ITEM') => ({ AND: [await bookEntityScope(db, chapter.projectId, kind), { familyId: context.familyId, OR: visibilityWhere(context) }] })
  const [characters, places, items, comments] = await Promise.all([
    db.character.findMany({ where: await scope('CHARACTER'), select: { id: true, name: true } }),
    db.place.findMany({ where: await scope('PLACE'), select: { id: true, name: true } }),
    db.item.findMany({ where: await scope('ITEM'), select: { id: true, name: true } }),
    db.comment.findMany({ where: { chapterId, familyId: context.familyId, OR: visibilityWhere(context) }, select: { id: true, content: true, resolved: true } }),
  ])
  const targets = [
    ...characters.map(e => ({ ...e, kind: 'CHARACTER' })), ...places.map(e => ({ ...e, kind: 'PLACE' })),
    ...items.map(e => ({ ...e, kind: 'ITEM' })), ...comments.map(e => ({ id: e.id, name: e.content, kind: 'COMMENT', resolved: e.resolved })),
  ]
  const anchors = chapterReferences(chapter.content).references
  // Existence is distinct from visibility/book availability. Never offer a live,
  // private or temporarily unassigned target as an orphan for deletion.
  // Only IDs in this family are read; no hidden names/content are returned.
  const ids = (kind: string) => anchors.filter(r => r.kind === kind || (kind !== 'COMMENT' && r.kind === 'UNKNOWN')).map(r => r.targetId)
  const [knownCharacters, knownPlaces, knownItems, knownComments] = await Promise.all([
    db.character.findMany({ where: { familyId: context.familyId, id: { in: ids('CHARACTER') } }, select: { id: true } }),
    db.place.findMany({ where: { familyId: context.familyId, id: { in: ids('PLACE') } }, select: { id: true } }),
    db.item.findMany({ where: { familyId: context.familyId, id: { in: ids('ITEM') } }, select: { id: true } }),
    db.comment.findMany({ where: { familyId: context.familyId, chapterId, id: { in: ids('COMMENT') } }, select: { id: true } }),
  ])
  const known = new Set([
    ...knownCharacters.map(e => `CHARACTER:${e.id}`), ...knownPlaces.map(e => `PLACE:${e.id}`),
    ...knownItems.map(e => `ITEM:${e.id}`), ...knownComments.map(e => `COMMENT:${e.id}`),
    ...targets.map(t => `${t.kind}:${t.id}`),
    ...[...knownCharacters, ...knownPlaces, ...knownItems].map(e => `UNKNOWN:${e.id}`),
  ])
  const available = new Set(targets.map(t => `${t.kind}:${t.id}`))
  const references = anchors.map(ref => ({ ...ref, orphaned: !known.has(`${ref.kind}:${ref.targetId}`), unavailable: known.has(`${ref.kind}:${ref.targetId}`) && !available.has(`${ref.kind}:${ref.targetId}`) }))
  return { chapter, references, targets }
}
export async function GET(request: NextRequest) {
  const context = await getAuthContext(request)
  if (!context) return json({ error: 'Nicht autorisiert' }, 401)
  const chapterId = request.nextUrl.searchParams.get('chapterId')
  if (!chapterId) return json({ chapters: await prisma.chapter.findMany({ where: { project: { userId: context.userId } }, select: { id: true, title: true, project: { select: { title: true } } }, orderBy: { order: 'asc' } }) })
  const result = await inspect(prisma, context, chapterId)
  if (!result) return json({ error: 'Kapitel nicht gefunden' }, 404)
  return json({ updatedAt: result.chapter.updatedAt, references: result.references, targets: result.targets })
}
export async function POST(request: NextRequest) {
  const context = await getAuthContext(request)
  if (!context) return json({ error: 'Nicht autorisiert' }, 401)
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'Unzulässige Herkunft' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'JSON erforderlich' }, 415)
  const raw = await request.text()
  if (raw.length > 4096) return json({ error: 'Anfrage zu groß' }, 413)
  let body
  try { body = JSON.parse(raw) } catch { return json({ error: 'Ungültiges JSON' }, 400) }
  if (!body || Array.isArray(body) || typeof body.chapterId !== 'string' || typeof body.key !== 'string' || typeof body.expectedUpdatedAt !== 'string' || !(body.targetId === null || typeof body.targetId === 'string')) return json({ error: 'Ungültige Änderung' }, 400)
  try {
    return await prisma.$transaction(async tx => {
      const result = await inspect(tx, context, body.chapterId)
      if (!result) return json({ error: 'Kapitel nicht gefunden' }, 404)
      if (result.chapter.updatedAt.toISOString() !== body.expectedUpdatedAt) return json({ error: 'Kapitel wurde verändert. Bitte neu laden.' }, 409)
      const ref = result.references.find(r => r.key === body.key)
      if (!ref || !ref.orphaned) return json({ error: 'Keine verwaiste Verknüpfung' }, 409)
      const target = result.targets.find(t => t.kind === ref.kind && t.id === body.targetId)
      if (body.targetId !== null && !target) return json({ error: 'Unzulässiges Ziel' }, 400)
      const changed = chapterReferences(result.chapter.content, { key: body.key, targetId: body.targetId, resolved: target && 'resolved' in target && typeof target.resolved === 'boolean' ? target.resolved : undefined })
      if (!changed.changed) return json({ error: 'Verknüpfung nicht gefunden' }, 409)
      await tx.chapterVersion.create({ data: {
        name: 'Vor Reparatur einer verwaisten Verknüpfung ' + new Date().toISOString(),
        chapterId: result.chapter.id, authorId: context.userId, familyId: context.familyId,
        content: result.chapter.content === null ? Prisma.JsonNull : result.chapter.content as Prisma.InputJsonValue,
        wordCount: result.chapter.wordCount,
      } })
      const updated = await tx.chapter.updateMany({ where: { id: body.chapterId, updatedAt: result.chapter.updatedAt }, data: { content: changed.content as Prisma.InputJsonValue, updatedAt: nextChapterRevision(result.chapter.updatedAt) } })
      if (updated.count !== 1) throw new ChapterWriteConflict('Concurrent chapter update; transaction rolled back')
      return json({ ok: true })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (isChapterWriteConflict(error)) return json({ error: 'Zwischenzeitliche Änderung. Bitte Kapitel neu laden.' }, 409)
    throw error
  }
}
