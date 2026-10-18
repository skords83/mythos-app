/** @jest-environment node */
import { prisma } from './prisma'
import { runStoryAction } from './story-service'
import { sourceHash } from './evidence-anchor'
import { storyTools, valid } from './story-tool-schema'
jest.mock('./prisma', () => { const model = () => Object.fromEntries(['findFirst', 'findUnique', 'findMany', 'create', 'updateMany', 'deleteMany', 'aggregate', 'count'].map(k => [k, jest.fn()])); return { prisma: { $transaction: jest.fn(), scene: model(), chapter: model(), relation: model(), character: model(), place: model(), item: model(), faction: model(), timelineEvent: model(), loreEntry: model(), sourceEvidence: model() } } })
const db = prisma as any
const auth = { userId: 'u', familyId: 'f', role: 'ADULT' as const }
const date = new Date('2026-10-17T10:00:00Z'), expectedUpdatedAt = date.toISOString()
const owned = { id: 's', familyId: 'f', authorId: 'u', visibility: 'PRIVATE', chapterId: 'c', updatedAt: date, order: 0 }
const edge = { ...owned, id: 'r', sourceType: 'CHARACTER', sourceId: 'a', targetType: 'PLACE', targetId: 'b', relationType: 'LIVES_IN', label: 'alt' }
const quote = '<p>Grüne Augen.</p>'
const proof = { ...owned, id: 'e', entityType: 'CHARACTER', entityId: 'a', chapterId: 'c', sceneId: null, statement: 'Grüne Augen', quote: 'Grüne Augen.', prefix: '', suffix: '', commentId: null, sourceHash: sourceHash(quote), flagged: false }
beforeEach(() => {
  jest.resetAllMocks()
  db.$transaction.mockImplementation((fn: any) => fn(db))
  db.scene.findFirst.mockResolvedValue(owned)
  db.chapter.findFirst.mockResolvedValue({ id: 'c', projectId: 'p', content: quote, updatedAt: date })
  for (const name of ['scene','relation','sourceEvidence']) { db[name].updateMany.mockResolvedValue({ count: 1 }); db[name].deleteMany.mockResolvedValue({ count: 1 }); db[name].findUnique.mockResolvedValue({ id: name }) }
  db.scene.findMany.mockResolvedValue([owned]); db.scene.aggregate.mockResolvedValue({ _max: { order: 9 } })
  db.character.findFirst.mockResolvedValue({ ...owned, id: 'a' }); db.place.findFirst.mockResolvedValue({ ...owned, id: 'b' })
  db.relation.findFirst.mockResolvedValue(null); db.relation.findMany.mockResolvedValue([])
  db.sourceEvidence.findFirst.mockResolvedValue(proof); db.sourceEvidence.findMany.mockResolvedValue([proof]); db.sourceEvidence.count.mockResolvedValue(0)
})
const run = (name: string, args: any) => runStoryAction(auth, name, args)
test('schemas reject unknown fields, invalid arrays and missing version', async () => {
  expect((await run('update_scene', { id: 's', name: 'x' })).status).toBe(400)
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, content: 'prose' })).status).toBe(400)
  expect((await run('create_scene', { chapterId: 'c', name: 'X', tags: null })).status).toBe(400)
  for (const tool of storyTools) { expect(tool.securitySchemes[0].scopes).toContain('mythos:read'); expect(valid(tool.inputSchema, null)).toBe(false) }
})
test('scene update preserves omitted fields and never writes chapter text', async () => {
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, outline: null })).status).toBe(200)
  expect(db.scene.updateMany.mock.calls[0][0].data).toEqual({ outline: null, updatedAt: expect.any(Date) })
  expect(db.chapter.updateMany).not.toHaveBeenCalled()
})
test('scene rights and stale versions prevent all writes', async () => {
  db.scene.findFirst.mockResolvedValue({ ...owned, authorId: 'other' })
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, name: 'X' })).status).toBe(404)
  db.scene.findFirst.mockResolvedValue({ ...owned, authorId: 'other', visibility: 'FAMILY' })
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, name: 'X' })).status).toBe(403)
  db.scene.findFirst.mockResolvedValue(owned)
  expect((await run('update_scene', { id: 's', expectedUpdatedAt: '2020-01-01T00:00:00Z' })).status).toBe(409)
  expect(db.scene.updateMany).not.toHaveBeenCalled()
})
test('scene moves append without duplicating text; cross-project and anchored moves fail', async () => {
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, chapterId: 'next' })).status).toBe(200)
  expect(db.scene.updateMany.mock.calls[0][0].data).toMatchObject({ chapterId: 'next', order: 10 })
  db.sourceEvidence.count.mockResolvedValue(1)
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, chapterId: 'next' })).status).toBe(409)
  db.chapter.findFirst.mockImplementation(({ where }: any) => ({ id: where.id, projectId: where.id === 'next' ? 'other' : 'p' }))
  expect((await run('update_scene', { id: 's', expectedUpdatedAt, chapterId: 'next' })).status).toBe(400)
})
test('reorder validates complete permutation and all versions before mutation', async () => {
  db.scene.findMany.mockResolvedValue([owned, { ...owned, id: 's2', order: 1 }])
  expect((await run('reorder_scenes', { chapterId: 'c', scenes: [{ id: 's', expectedUpdatedAt }] })).status).toBe(409)
  expect((await run('reorder_scenes', { chapterId: 'c', scenes: [{ id: 's', expectedUpdatedAt }, { id: 's', expectedUpdatedAt }] })).status).toBe(409)
  expect(db.scene.updateMany).not.toHaveBeenCalled()
  expect((await run('reorder_scenes', { chapterId: 'c', scenes: [{ id: 's2', expectedUpdatedAt }, { id: 's', expectedUpdatedAt }] })).status).toBe(200)
  expect(db.scene.updateMany.mock.calls.map((c: any) => [c[0].where.id, c[0].data.order])).toEqual([['s2', 0], ['s', 1]])
})
test('reorder refuses foreign rows and detects a raced CAS', async () => {
  db.scene.findMany.mockResolvedValue([{ ...owned, authorId: 'other' }])
  expect((await run('reorder_scenes', { chapterId: 'c', scenes: [] })).status).toBe(403)
  db.scene.findMany.mockResolvedValue([owned]); db.scene.updateMany.mockResolvedValue({ count: 0 })
  expect((await run('reorder_scenes', { chapterId: 'c', scenes: [{ id: 's', expectedUpdatedAt }] })).status).toBe(409)
})
test('single relation update and removal affect only ID+version, retain other metadata', async () => {
  db.relation.findFirst.mockResolvedValueOnce(edge).mockResolvedValueOnce(null)
  expect((await run('update_relation', { id: 'r', expectedUpdatedAt, label: null })).status).toBe(200)
  expect(db.relation.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'r', familyId: 'f', updatedAt: date }, data: { label: null } })
  expect(db.relation.updateMany.mock.calls[0][0].data.relationType).toBeUndefined()
  db.relation.findFirst.mockResolvedValue(edge)
  expect((await run('delete_relation', { id: 'r', expectedUpdatedAt })).status).toBe(200)
  expect(db.relation.deleteMany).toHaveBeenCalledWith({ where: { id: 'r', familyId: 'f', updatedAt: date } })
})
test('invisible endpoints prevent disclosure, creation, update and even owner deletion', async () => {
  db.place.findFirst.mockResolvedValue({ ...owned, authorId: 'other' }); db.relation.findFirst.mockResolvedValue(edge)
  expect((await run('create_relation', { sourceType: 'CHARACTER', sourceId: 'a', targetType: 'PLACE', targetId: 'b', relationType: 'X' })).status).toBe(404)
  expect((await run('update_relation', { id: 'r', expectedUpdatedAt, label: 'x' })).status).toBe(404)
  expect((await runStoryAction({ ...auth, role: 'OWNER' }, 'delete_relation', { id: 'r', expectedUpdatedAt })).status).toBe(404)
  db.relation.findMany.mockResolvedValue([edge])
  expect((await run('relations', { entityType: 'CHARACTER', entityId: 'a' }) as any).data.entries).toEqual([])
  expect(db.relation.deleteMany).not.toHaveBeenCalled()
})
test('foreign author and stale relation versions are protected', async () => {
  db.relation.findFirst.mockResolvedValue({ ...edge, authorId: 'other' })
  expect((await run('update_relation', { id: 'r', expectedUpdatedAt, label: 'x' })).status).toBe(403)
  db.relation.findFirst.mockResolvedValue(edge)
  expect((await run('delete_relation', { id: 'r', expectedUpdatedAt: '2020-01-01T00:00:00Z' })).status).toBe(409)
  expect(db.relation.deleteMany).not.toHaveBeenCalled()
})
test('membership direction and reserved timeline types are enforced on updates', async () => {
  db.relation.findFirst.mockResolvedValue(edge)
  expect((await run('update_relation', { id: 'r', expectedUpdatedAt, relationType: 'MEMBER_OF' })).status).toBe(400)
  expect((await run('update_relation', { id: 'r', expectedUpdatedAt, relationType: 'BEFORE' })).status).toBe(400)
})
test('evidence must match actual source and current source version', async () => {
  const args = { entityType: 'CHARACTER', entityId: 'a', statement: 'Augen', chapterId: 'c', quote: 'Grüne Augen.', sourceExpectedUpdatedAt: expectedUpdatedAt }
  expect((await run('create_evidence', args)).status).toBe(201)
  expect(db.sourceEvidence.create.mock.calls[0][0].data).toMatchObject({ sourceHash: sourceHash(quote), authorId: 'u' })
  expect((await run('create_evidence', { ...args, quote: 'Erfundene Aussage' })).status).toBe(400)
  expect((await run('create_evidence', { ...args, sourceExpectedUpdatedAt: '2020-01-01T00:00:00Z' })).status).toBe(409)
})
test('evidence read reports stale and missing without modifying saved evidence', async () => {
  expect((await run('evidence', { entityType: 'CHARACTER', entityId: 'a' }) as any).data.entries[0].status).toBe('VALID')
  db.chapter.findFirst.mockResolvedValue({ id: 'c', content: '<p>Neu. Grüne Augen.</p>' })
  expect((await run('evidence', { entityType: 'CHARACTER', entityId: 'a' }) as any).data.entries[0].status).toBe('STALE')
  db.chapter.findFirst.mockResolvedValue({ id: 'c', content: 'Gelöscht' })
  expect((await run('evidence', { entityType: 'CHARACTER', entityId: 'a' }) as any).data.entries[0].status).toBe('MISSING')
  expect(db.sourceEvidence.updateMany).not.toHaveBeenCalled()
})
test('evidence protects author, source ownership and version; metadata edits preserve anchor', async () => {
  expect((await run('update_evidence', { id: 'e', expectedUpdatedAt, statement: 'Neu' })).status).toBe(200)
  expect(db.sourceEvidence.updateMany.mock.calls[0][0].data.sourceHash).toBeUndefined()
  expect((await run('update_evidence', { id: 'e', expectedUpdatedAt, quote: 'Neu' })).status).toBe(400)
  expect((await run('delete_evidence', { id: 'e', expectedUpdatedAt: '2020-01-01T00:00:00Z' })).status).toBe(409)
  db.character.findFirst.mockResolvedValue({ ...owned, authorId: 'other', visibility: 'FAMILY' })
  expect((await run('delete_evidence', { id: 'e', expectedUpdatedAt })).status).toBe(403)
  db.character.findFirst.mockResolvedValue(owned); db.chapter.findFirst.mockResolvedValue(null)
  expect((await run('evidence', { entityType: 'CHARACTER', entityId: 'a' }) as any).data.entries).toEqual([])
  expect((await run('delete_evidence', { id: 'e', expectedUpdatedAt })).status).toBe(404)
})

const event = { ...owned, id: 'ev', projectId: 'p', title: 'Ankunft', date: null }
beforeEach(() => {
  db.project = { findFirst: jest.fn().mockResolvedValue({ id: 'p' }), findMany: jest.fn().mockResolvedValue([]) }
  db.timelineEvent.findFirst.mockResolvedValue(event)
  db.timelineEvent.findMany.mockResolvedValue([event])
  db.timelineEvent.aggregate.mockResolvedValue({ _max: { order: 4 } })
  db.timelineEvent.updateMany.mockResolvedValue({ count: 1 })
  db.timelineEvent.deleteMany.mockResolvedValue({ count: 1 })
  db.timelineEvent.findUnique.mockResolvedValue(event)
})
test('event creation appends undated duplicate titles; partial updates clear nullable fields only', async () => {
  for (let i = 0; i < 2; i++) expect((await run('create_event', { projectId: 'p', title: 'Ankunft' })).status).toBe(201)
  expect(db.timelineEvent.create).toHaveBeenCalledTimes(2)
  expect(db.timelineEvent.create.mock.calls[0][0].data).toMatchObject({ order: 5, authorId: 'u' })
  expect((await run('update_event', { projectId: 'p', id: 'ev', expectedUpdatedAt, date: '', duration: null, chapterId: null, description: null })).status).toBe(200)
  expect(db.timelineEvent.updateMany.mock.calls[0][0].data).toEqual({ date: '', duration: null, chapterId: null, description: null, updatedAt: expect.any(Date) })
  expect(db.chapter.updateMany).not.toHaveBeenCalled()
})
test('event rights, source project, schema and versions prevent writes', async () => {
  const args = { projectId: 'p', id: 'ev', expectedUpdatedAt, title: 'Neu' }
  expect((await run('update_event', { ...args, expectedUpdatedAt: '2000-01-01T00:00:00Z' })).status).toBe(409)
  expect((await run('update_event', { ...args, order: -1 })).status).toBe(400)
  db.chapter.findFirst.mockResolvedValue(null)
  expect((await run('update_event', { ...args, chapterId: 'foreign' })).status).toBe(400)
  db.timelineEvent.findFirst.mockResolvedValue({ ...event, authorId: 'other', visibility: 'FAMILY' })
  expect((await run('update_event', args)).status).toBe(403)
  db.timelineEvent.findFirst.mockResolvedValue({ ...event, authorId: 'other' })
  expect((await run('delete_event', args)).status).toBe(400) // unknown title
  expect((await run('update_event', args)).status).toBe(404)
  db.project.findFirst.mockResolvedValue(null)
  expect((await run('create_event', { projectId: 'p', title: 'Neu' })).status).toBe(404)
  expect(db.timelineEvent.updateMany).not.toHaveBeenCalled()
})
test('event deletion uses shared cleanup and CAS inside serializable transaction', async () => {
  expect((await run('delete_event', { projectId: 'p', id: 'ev', expectedUpdatedAt })).status).toBe(200)
  expect(db.sourceEvidence.deleteMany).toHaveBeenCalledWith({ where: { entityType: 'EVENT', entityId: 'ev' } })
  expect(db.relation.deleteMany).toHaveBeenCalled()
  expect(db.timelineEvent.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p', familyId: 'f', id: 'ev', updatedAt: date } })
  expect(db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
})
test('event reorder validates full permutation and versions before any write', async () => {
  const args = { projectId: 'p', events: [{ id: 'ev', expectedUpdatedAt }] }
  expect((await run('reorder_events', { ...args, events: [] })).status).toBe(409)
  expect((await run('reorder_events', { ...args, events: [...args.events, ...args.events] })).status).toBe(409)
  expect(db.timelineEvent.updateMany).not.toHaveBeenCalled()
  expect((await run('reorder_events', args)).status).toBe(200)
  db.timelineEvent.findMany.mockResolvedValue([{ ...event, authorId: 'other' }])
  expect((await run('reorder_events', args)).status).toBe(403)
})
test('EVENT evidence supports creation and rejects cross-project source', async () => {
  const args = { entityType: 'EVENT', entityId: 'ev', statement: 'Ankunft', chapterId: 'c', quote: 'Grüne Augen.', sourceExpectedUpdatedAt: expectedUpdatedAt }
  expect((await run('create_evidence', args)).status).toBe(201)
  db.chapter.findFirst.mockResolvedValue({ id: 'c', projectId: 'other', content: quote, updatedAt: date })
  expect((await run('create_evidence', args)).status).toBe(400)
})
test('event edges reject unrelated projects but allow owned books in the same universe', async () => {
  db.character.findFirst.mockResolvedValue({ ...owned, id: 'a', projectId: 'other' })
  const args = { sourceType: 'EVENT', sourceId: 'ev', targetType: 'CHARACTER', targetId: 'a', relationType: 'INVOLVES' }
  expect((await run('create_relation', args)).status).toBe(400)
  db.project.findMany.mockResolvedValue([{ id: 'p', universeId: 'universe' }, { id: 'other', universeId: 'universe' }])
  expect((await run('create_relation', args)).status).toBe(201)
})
test('continuity dependencies block event deletion before cleanup', async () => {
  db.continuityAssertion = { count: jest.fn().mockResolvedValue(1) }
  expect((await run('delete_event', { projectId: 'p', id: 'ev', expectedUpdatedAt })).status).toBe(409)
  expect(db.sourceEvidence.deleteMany).not.toHaveBeenCalled()
  expect(db.timelineEvent.deleteMany).not.toHaveBeenCalled()
  delete db.continuityAssertion
})
