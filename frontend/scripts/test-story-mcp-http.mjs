/** Isolated, real PostgreSQL + HTTP + official MCP SDK. Never target user projects. */
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
const url = new URL(process.env.DATABASE_URL || 'file:///missing')
assert.equal(process.env.MYTHOS_RUN_MCP_INTEGRATION, '1')
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55432'); assert.equal(url.pathname, '/mythos_integration_test')
assert.equal(process.env.MYTHOS_OAUTH_ISSUER, 'http://localhost:4000')
assert.equal(process.env.REDIS_URL, 'redis://127.0.0.1:56379')
const origin = process.env.MYTHOS_OAUTH_ISSUER, resource = origin + '/api/integrations/mcp'
const db = new PrismaClient(), suffix = randomBytes(12).toString('hex'), secret = randomBytes(32).toString('hex')
let family, clientId, sdk, checks = 0
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++ }
try {
  family = await db.family.create({ data: { name: 'Isolated story test ' + suffix } })
  const user = await db.user.create({ data: { email: suffix + '@example.invalid', password: 'disabled', familyId: family.id, role: 'OWNER' } })
  const other = await db.user.create({ data: { email: 'other-' + suffix + '@example.invalid', password: 'disabled', familyId: family.id } })
  const scope = { familyId: family.id, authorId: user.id }
  const project = await db.project.create({ data: { userId: user.id, title: 'Story fixture' } })
  const chapter = await db.chapter.create({ data: { projectId: project.id, title: 'Ankunft', content: '<p>Ada hat grüne Augen.</p>' } })
  const second = await db.chapter.create({ data: { projectId: project.id, title: 'Abreise', content: '' } })
  const character = await db.character.create({ data: { ...scope, projectId: project.id, name: 'Ada' } })
  const place = await db.place.create({ data: { ...scope, projectId: project.id, name: 'Hafen' } })
  const hidden = await db.place.create({ data: { ...scope, authorId: other.id, projectId: project.id, name: 'Geheim' } })
  clientId = 'story-' + suffix
  await db.oAuthClient.create({ data: { id: clientId, name: 'Isolated story test', redirectUris: [origin + '/callback'] } })
  await db.oAuthAccessToken.create({ data: { clientId, userId: user.id, tokenHash: createHash('sha256').update(secret).digest('hex'), scope: 'mythos:read mythos:write', resource, expiresAt: new Date(Date.now() + 600000) } })
  sdk = new Client({ name: 'story-integration', version: '1.0' })
  await sdk.connect(new StreamableHTTPClientTransport(new URL(resource), { requestInit: { headers: { authorization: 'Bearer ' + secret } } }))
  const tools = await sdk.listTools()
  check(tools.tools.filter(t => ['mythos_scene', 'mythos_reorder_scenes', 'mythos_update_relation', 'mythos_create_evidence'].includes(t.name)).length, 4)
  const call = async (action, args, status = 200) => { const result = await sdk.callTool({ name: 'mythos_' + action, arguments: args }); const out = JSON.parse(result.content[0].text); check(out.status, status); return out.data }
  let scene = await call('create_scene', { chapterId: chapter.id, name: 'Ankunft', outline: 'Plan', tags: ['Hafen'] }, 201)
  const scene2 = await call('create_scene', { chapterId: chapter.id, name: 'Treffen' }, 201)
  check((await call('scenes', { chapterId: chapter.id })).entries.length, 2)
  await call('update_scene', { id: scene.id, expectedUpdatedAt: '2020-01-01T00:00:00Z', name: 'Stale' }, 409)
  scene = await call('update_scene', { id: scene.id, expectedUpdatedAt: scene.updatedAt, description: 'Zusammenfassung' })
  check(scene.outline, 'Plan')
  const sorted = await call('reorder_scenes', { chapterId: chapter.id, scenes: [{ id: scene2.id, expectedUpdatedAt: scene2.updatedAt }, { id: scene.id, expectedUpdatedAt: scene.updatedAt }] })
  check(sorted.entries.map(s => s.id), [scene2.id, scene.id])
  scene = sorted.entries[1]
  await call('reorder_scenes', { chapterId: chapter.id, scenes: [{ id: scene.id, expectedUpdatedAt: scene.updatedAt }] }, 409)
  scene = await call('update_scene', { id: scene.id, expectedUpdatedAt: scene.updatedAt, chapterId: second.id })
  check(scene.chapterId, second.id)
  check((await db.chapter.findUnique({ where: { id: chapter.id } })).content, chapter.content)
  const edgeArgs = { sourceType: 'CHARACTER', sourceId: character.id, targetType: 'PLACE', targetId: place.id, relationType: 'LIVES_IN', label: 'Wohnort' }
  let edge = await call('create_relation', edgeArgs, 201)
  const unrelated = await call('create_relation', { ...edgeArgs, relationType: 'VISITS' }, 201)
  await call('create_relation', { ...edgeArgs, targetId: hidden.id }, 404)
  edge = await call('update_relation', { id: edge.id, expectedUpdatedAt: edge.updatedAt, label: null })
  check(edge.label, null)
  check(await db.relation.count({ where: { id: unrelated.id } }), 1)
  await call('delete_relation', { id: edge.id, expectedUpdatedAt: '2020-01-01T00:00:00Z' }, 409)
  await call('delete_relation', { id: edge.id, expectedUpdatedAt: edge.updatedAt })
  check(await db.relation.count({ where: { id: unrelated.id } }), 1)
  const evidenceArgs = { entityType: 'CHARACTER', entityId: character.id, chapterId: chapter.id, field: 'appearance', statement: 'Ada hat grüne Augen', quote: 'Ada hat grüne Augen.', sourceExpectedUpdatedAt: chapter.updatedAt.toISOString() }
  const evidence = await call('create_evidence', evidenceArgs, 201)
  await call('create_evidence', evidenceArgs, 201) // multiple proofs per claim are allowed
  check((await call('evidence', { entityType: 'CHARACTER', entityId: character.id })).entries[0].status, 'VALID')
  await call('create_evidence', { ...evidenceArgs, quote: 'Erfundener Beleg' }, 400)
  await db.chapter.update({ where: { id: chapter.id }, data: { content: '<p>Neu. Ada hat grüne Augen.</p>' } })
  check((await call('evidence', { entityType: 'CHARACTER', entityId: character.id })).entries[0].status, 'STALE')
  await db.chapter.update({ where: { id: chapter.id }, data: { content: '<p>Gelöscht.</p>' } })
  check((await call('evidence', { entityType: 'CHARACTER', entityId: character.id })).entries[0].status, 'MISSING')
  await call('delete_evidence', { id: evidence.id, expectedUpdatedAt: evidence.updatedAt })
  const cookie = 'auth-token=' + jwt.sign({ userId: user.id, email: user.email, familyId: family.id, role: 'OWNER' }, process.env.JWT_SECRET)
  const web = await fetch(origin + '/api/story', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'evidence', args: { entityType: 'CHARACTER', entityId: character.id } }) })
  check(web.status, 200); check((await web.json()).data.entries.length, 1)
  // Concurrent updates: exactly one wins; stale writer cannot overwrite.
  const races = await Promise.all(['A', 'B'].map(name => sdk.callTool({ name: 'mythos_update_scene', arguments: { id: scene.id, expectedUpdatedAt: scene.updatedAt, name } })))
  check(races.map(r => JSON.parse(r.content[0].text).status).sort(), [200, 409])
  console.log(`Story MCP HTTP: ${checks} assertions passed (real PostgreSQL, SDK and session API).`)
} finally {
  if (sdk) await sdk.close()
  if (clientId) await db.oAuthClient.deleteMany({ where: { id: clientId } })
  if (family) await db.family.delete({ where: { id: family.id } })
  await db.$disconnect()
}
