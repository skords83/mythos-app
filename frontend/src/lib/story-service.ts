import { Prisma, RelatableEntityType } from '@prisma/client'
import type { AuthContext } from './auth'
import { prisma } from './prisma'
import { resolveEntity, isEntityVisibleToViewer } from './relations'
import { readMcpRelations } from './mcp-relations'
import { storyTools, valid } from './story-tool-schema'
import { locateEvidence, sourceHash } from './evidence-anchor'

type DB = Prisma.TransactionClient
class StoryError extends Error { constructor(public status: number, message: string) { super(message) } }
const fail = (status: number, message: string): never => { throw new StoryError(status, message) }
const conflict = () => fail(409, 'Zwischenzeitlich geändert. Bitte erneut lesen und Änderungen prüfen.')
const stamp = (old: Date) => new Date(Math.max(Date.now(), old.getTime() + 1))
const checkVersion = (old: Date, expected: string) => { if (old.getTime() !== new Date(expected).getTime()) conflict() }
async function endpoint(db: DB, auth: AuthContext, type: RelatableEntityType, id: string) {
  const row = await resolveEntity(db, type, id, auth.familyId)
  if (!row || !isEntityVisibleToViewer(auth, row)) return fail(404, 'Eintrag nicht gefunden oder nicht zugänglich.')
  return row
}
async function chapter(db: DB, auth: AuthContext, id: string, owned = false) {
  const row = await db.chapter.findFirst({ where: { id, project: owned ? { userId: auth.userId } : { user: { familyId: auth.familyId } } } })
  if (!row) return fail(404, 'Kapitel nicht gefunden oder nicht zugänglich.')
  return row
}
async function scene(db: DB, auth: AuthContext, id: string) {
  await endpoint(db, auth, 'SCENE', id)
  const row = await db.scene.findFirst({ where: { id, familyId: auth.familyId } })
  if (!row) return fail(404, 'Szene nicht gefunden.')
  await chapter(db, auth, row.chapterId)
  return row
}
const author = (auth: AuthContext, row: { authorId: string }) => { if (row.authorId !== auth.userId) fail(403, 'Nur der Autor darf diesen Eintrag ändern.') }
const page = <T>(rows: T[], args: any) => { const limit = args.limit ?? 50, start = ((args.page ?? 1) - 1) * limit; return { entries: rows.slice(start, start + limit), page: args.page ?? 1, hasMore: rows.length > start + limit } }

export async function validateEdge(db: DB, auth: AuthContext, edge: { id?: string; sourceType: RelatableEntityType; sourceId: string; targetType: RelatableEntityType; targetId: string; relationType: string }) {
  await endpoint(db, auth, edge.sourceType, edge.sourceId)
  await endpoint(db, auth, edge.targetType, edge.targetId)
  if (edge.sourceType === edge.targetType && edge.sourceId === edge.targetId) fail(400, 'Eine Entität kann nicht mit sich selbst verknüpft werden.')
  if (['MEMBER_OF', 'LEADER_OF', 'FOUNDER_OF', 'FORMER_MEMBER_OF'].includes(edge.relationType) && (edge.sourceType !== 'CHARACTER' || edge.targetType !== 'FACTION')) fail(400, 'Mitgliedschaften verlaufen von Figur zu Fraktion.')
  const reserved = ['BEFORE', 'TAKES_PLACE_AT', 'REFERENCES_PAST'].includes(edge.relationType)
  if (reserved) {
    if (edge.targetType !== 'EVENT' || edge.sourceType !== (edge.relationType === 'BEFORE' ? 'EVENT' : 'SCENE')) fail(400, 'Ungültige Timeline-Verknüpfung.')
    const target = await db.timelineEvent.findFirst({ where: { id: edge.targetId, familyId: auth.familyId } })
    const origin = edge.sourceType === 'EVENT' ? await db.timelineEvent.findFirst({ where: { id: edge.sourceId, familyId: auth.familyId } }) : await db.scene.findFirst({ where: { id: edge.sourceId, familyId: auth.familyId }, include: { chapter: true } })
    const projectId = origin && ('chapter' in origin ? origin.chapter.projectId : origin.projectId)
    if (!target?.projectId || target.projectId !== projectId) fail(400, 'Timeline-Verknüpfungen müssen im selben Projekt liegen.')
  }
  const other = edge.id ? { id: { not: edge.id } } : {}
  const duplicate = await db.relation.findFirst({ where: { familyId: auth.familyId, ...other, sourceType: edge.sourceType, sourceId: edge.sourceId, relationType: edge.relationType,
    ...(edge.relationType === 'TAKES_PLACE_AT' ? {} : { targetType: edge.targetType, targetId: edge.targetId }) } })
  // Deliberately do not reveal the existing edge (it may be invisible).
  if (duplicate) fail(409, 'Diese Zuordnung kann nicht zusätzlich angelegt werden.')
}

async function scenes(db: DB, auth: AuthContext, action: string, args: any) {
  if (action === 'scenes') {
    await chapter(db, auth, args.chapterId)
    const rows = await db.scene.findMany({ where: { chapterId: args.chapterId, familyId: auth.familyId, OR: [{ authorId: auth.userId }, { visibility: 'FAMILY' }] }, orderBy: [{ order: 'asc' }, { id: 'asc' }] })
    const result = page(rows, args)
    return { ...result, entries: await Promise.all(result.entries.map(async row => ({ ...row, relations: await readMcpRelations(db, 'SCENE', row, auth.userId) }))) }
  }
  if (action === 'scene') { const row = await scene(db, auth, args.id); return { ...row, relations: await readMcpRelations(db, 'SCENE', row, auth.userId) } }
  if (action === 'reorder_scenes') {
    await chapter(db, auth, args.chapterId)
    const rows = await db.scene.findMany({ where: { chapterId: args.chapterId, familyId: auth.familyId } })
    // Full permutation and per-row CAS, never silently reorder hidden/foreign rows.
    if (rows.some(row => row.authorId !== auth.userId)) fail(403, 'Nur Kapitel mit ausschließlich eigenen Szenen können so sortiert werden.')
    if (rows.length !== args.scenes.length || new Set(args.scenes.map((s: any) => s.id)).size !== rows.length) conflict()
    for (const item of args.scenes) { const row = rows.find(r => r.id === item.id); if (!row) conflict(); checkVersion(row!.updatedAt, item.expectedUpdatedAt) }
    for (const [order, item] of args.scenes.entries()) {
      const row = rows.find(r => r.id === item.id)!
      const result = await db.scene.updateMany({ where: { id: row.id, authorId: auth.userId, familyId: auth.familyId, updatedAt: row.updatedAt }, data: { order, updatedAt: stamp(row.updatedAt) } })
      if (result.count !== 1) conflict()
    }
    return { entries: await db.scene.findMany({ where: { chapterId: args.chapterId, familyId: auth.familyId }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }) }
  }
  const { id, expectedUpdatedAt, ...data } = args
  if (action === 'create_scene') {
    await chapter(db, auth, data.chapterId)
    const last = await db.scene.aggregate({ where: { chapterId: data.chapterId }, _max: { order: true } })
    return db.scene.create({ data: { ...data, order: (last._max.order ?? -1) + 1, familyId: auth.familyId, authorId: auth.userId } })
  }
  const row = await scene(db, auth, id)
  author(auth, row); checkVersion(row.updatedAt, expectedUpdatedAt)
  if (data.chapterId && data.chapterId !== row.chapterId) {
    const from = await chapter(db, auth, row.chapterId), to = await chapter(db, auth, data.chapterId)
    if (from.projectId !== to.projectId) fail(400, 'Szenen können nur innerhalb desselben Projekts verschoben werden.')
    const last = await db.scene.aggregate({ where: { chapterId: data.chapterId }, _max: { order: true } })
    data.order = (last._max.order ?? -1) + 1
    // Evidence still points to its original chapter text. Do not silently relocate it.
    if (await db.sourceEvidence.count({ where: { sceneId: id } })) fail(409, 'Die Szene besitzt Quellenbelege. Entferne zuerst deren Szenenzuordnung; Kapitelbelege bleiben erhalten.')
  }
  const result = await db.scene.updateMany({ where: { id, familyId: auth.familyId, authorId: auth.userId, updatedAt: row.updatedAt }, data: { ...data, updatedAt: stamp(row.updatedAt) } })
  if (result.count !== 1) conflict()
  return db.scene.findUnique({ where: { id } })
}

async function relations(db: DB, auth: AuthContext, action: string, args: any) {
  if (action === 'relations') {
    const anchor = await endpoint(db, auth, args.entityType, args.entityId)
    return page(await readMcpRelations(db, args.entityType, anchor, auth.userId), args)
  }
  const { id, expectedUpdatedAt, ...data } = args
  if (action === 'create_relation') {
    await validateEdge(db, auth, data)
    return db.relation.create({ data: { ...data, familyId: auth.familyId, authorId: auth.userId } })
  }
  const row = await db.relation.findFirst({ where: { id, familyId: auth.familyId } })
  if (!row) return fail(404, 'Beziehung nicht gefunden.')
  await endpoint(db, auth, row.sourceType, row.sourceId); await endpoint(db, auth, row.targetType, row.targetId)
  if (action !== 'delete_relation' || auth.role !== 'OWNER') author(auth, row)
  checkVersion(row.updatedAt, expectedUpdatedAt)
  const where = { id, familyId: auth.familyId, updatedAt: row.updatedAt }
  if (action === 'delete_relation') { if ((await db.relation.deleteMany({ where })).count !== 1) conflict(); return { deleted: id } }
  await validateEdge(db, auth, { ...row, ...data })
  if ((await db.relation.updateMany({ where, data: { ...data, updatedAt: stamp(row.updatedAt) } })).count !== 1) conflict()
  return db.relation.findUnique({ where: { id } })
}

async function knowledge(db: DB, auth: AuthContext, type: RelatableEntityType, id: string, writing: boolean) {
  if (!['CHARACTER', 'PLACE', 'ITEM', 'FACTION', 'LORE_ENTRY'].includes(type)) return fail(400, 'Quellenbelege gehören zu Figuren, Orten, Items, Fraktionen oder Hintergrundwissen.')
  const row = await endpoint(db, auth, type, id)
  if (writing) author(auth, row)
  return row
}
async function evidenceSource(db: DB, auth: AuthContext, row: { chapterId: string; sceneId?: string | null }) {
  const source = await chapter(db, auth, row.chapterId, true) // same rights as chapter GET; family sharing does not share prose
  if (row.sceneId) { const s = await scene(db, auth, row.sceneId); if (s.chapterId !== source.id) fail(400, 'Szene gehört nicht zum angegebenen Kapitel.') }
  return source
}
async function evidence(db: DB, auth: AuthContext, action: string, args: any) {
  if (action === 'evidence') {
    await knowledge(db, auth, args.entityType, args.entityId, false)
    const rows = await db.sourceEvidence.findMany({ where: { familyId: auth.familyId, entityType: args.entityType, entityId: args.entityId, chapter: { project: { userId: auth.userId } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    const visible = []
    for (const row of rows) {
      try { const source = await evidenceSource(db, auth, row); visible.push({ ...row, chapterTitle: source.title, ...locateEvidence(source.content, row) }) }
      catch (error) { if (!(error instanceof StoryError) || ![400, 404].includes(error.status)) throw error }
    }
    return page(visible, args)
  }
  const { id, expectedUpdatedAt, sourceExpectedUpdatedAt, ...data } = args
  const old = action === 'create_evidence' ? null : await db.sourceEvidence.findFirst({ where: { id, familyId: auth.familyId } })
  if (action !== 'create_evidence' && !old) return fail(404, 'Quellenbeleg nicht gefunden.')
  const merged = { prefix: '', suffix: '', commentId: null, flagged: false, ...old, ...data }
  await knowledge(db, auth, merged.entityType, merged.entityId, true)
  if (old) { author(auth, old); checkVersion(old.updatedAt, expectedUpdatedAt); await evidenceSource(db, auth, old) }
  const source = await evidenceSource(db, auth, merged)
  if (action === 'delete_evidence') {
    if ((await db.sourceEvidence.deleteMany({ where: { id, familyId: auth.familyId, authorId: auth.userId, updatedAt: old!.updatedAt } })).count !== 1) conflict()
    return { deleted: id }
  }
  const reanchor = !old || sourceExpectedUpdatedAt !== undefined || ['chapterId', 'sceneId', 'quote', 'prefix', 'suffix', 'commentId'].some(k => Object.hasOwn(data, k))
  if (reanchor) {
    if (!sourceExpectedUpdatedAt) fail(400, 'Aktueller Kapitelstand sourceExpectedUpdatedAt erforderlich.')
    checkVersion(source.updatedAt, sourceExpectedUpdatedAt)
    const located = locateEvidence(source.content, { ...merged, sourceHash: sourceHash(source.content), flagged: false })
    if (located.status !== 'VALID') fail(400, 'Textstelle nicht eindeutig auffindbar. Zitat, Kontext oder Kommentar-Anker prüfen.')
    Object.assign(data, { sourceHash: sourceHash(source.content), sourceUpdatedAt: source.updatedAt, flagged: args.flagged ?? false })
  }
  if (!old) return db.sourceEvidence.create({ data: { ...data, familyId: auth.familyId, authorId: auth.userId } })
  if ((await db.sourceEvidence.updateMany({ where: { id, familyId: auth.familyId, authorId: auth.userId, updatedAt: old.updatedAt }, data: { ...data, updatedAt: stamp(old.updatedAt) } })).count !== 1) conflict()
  return db.sourceEvidence.findUnique({ where: { id } })
}

// All adapters call this service. Serializable isolation protects multi-row ordering,
// endpoint visibility and special relation constraints; errors roll back all writes.
export async function runStoryAction(auth: AuthContext, action: string, input: unknown) {
  const tool = storyTools.find(t => t.name === `mythos_${action}`)
  if (!tool || !valid(tool.inputSchema, input)) return { status: 400, error: 'Ungültige Argumente.' }
  try {
    const data = await prisma.$transaction(async db => {
      if (action.includes('scene')) return scenes(db, auth, action, input)
      if (action.includes('relation')) return relations(db, auth, action, input)
      return evidence(db, auth, action, input)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return { status: action.startsWith('create_') ? 201 : 200, data }
  } catch (error) {
    if (error instanceof StoryError) return { status: error.status, error: error.message }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return { status: 409, error: 'Zwischenzeitlich geändert. Bitte erneut lesen.' }
    throw error
  }
}
