import { NextRequest, NextResponse } from 'next/server'
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
    db.comment.findMany({ where: { chapterId, familyId: context.familyId, OR: visibilityWhere(context) }, select: { id: true, content: true } }),
  ])
  const targets = [
    ...characters.map(e => ({ ...e, kind: 'CHARACTER' })), ...places.map(e => ({ ...e, kind: 'PLACE' })),
    ...items.map(e => ({ ...e, kind: 'ITEM' })), ...comments.map(e => ({ id: e.id, name: e.content, kind: 'COMMENT' })),
  ]
  const references = chapterReferences(chapter.content).references.map(ref => ({ ...ref, orphaned: !targets.some(t => t.kind === ref.kind && t.id === ref.targetId) }))
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
  if (!body || typeof body.chapterId !== 'string' || typeof body.key !== 'string' || typeof body.expectedUpdatedAt !== 'string' || !(body.targetId === null || typeof body.targetId === 'string')) return json({ error: 'Ungültige Änderung' }, 400)
  return prisma.$transaction(async tx => {
    const result = await inspect(tx, context, body.chapterId)
    if (!result) return json({ error: 'Kapitel nicht gefunden' }, 404)
    if (result.chapter.updatedAt.toISOString() !== body.expectedUpdatedAt) return json({ error: 'Kapitel wurde verändert. Bitte neu laden.' }, 409)
    const ref = result.references.find(r => r.key === body.key)
    if (!ref || !ref.orphaned) return json({ error: 'Keine verwaiste Verknüpfung' }, 409)
    if (body.targetId !== null && !result.targets.some(t => t.kind === ref.kind && t.id === body.targetId)) return json({ error: 'Unzulässiges Ziel' }, 400)
    const changed = chapterReferences(result.chapter.content, { key: body.key, targetId: body.targetId })
    if (!changed.changed) return json({ error: 'Verknüpfung nicht gefunden' }, 409)
    await tx.chapterVersion.create({ data: {
      name: 'Vor Reparatur einer verwaisten Verknüpfung ' + new Date().toISOString(),
      chapterId: result.chapter.id, authorId: context.userId, familyId: context.familyId,
      content: result.chapter.content === null ? Prisma.JsonNull : result.chapter.content as Prisma.InputJsonValue,
      wordCount: result.chapter.wordCount,
    } })
    const updated = await tx.chapter.updateMany({ where: { id: body.chapterId, updatedAt: result.chapter.updatedAt }, data: { content: changed.content as Prisma.InputJsonValue } })
    if (updated.count !== 1) throw new Error('Concurrent chapter update; transaction rolled back')
    return json({ ok: true })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
