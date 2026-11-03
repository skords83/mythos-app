/** Real MCP SDK/HTTP + isolated PostgreSQL. Approval deliberately stays session-only. */
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { assertLocalTestTargets } from './local-test-targets.mjs'
assertLocalTestTargets()
assert.equal(process.env.MYTHOS_RUN_MCP_INTEGRATION, '1')
assert.equal(process.env.MYTHOS_OAUTH_ISSUER, 'http://localhost:4000')
const origin = process.env.MYTHOS_OAUTH_ISSUER, resource = origin + '/api/integrations/mcp'
const db = new PrismaClient(), suffix = randomBytes(10).toString('hex')
let family, clientId, sdk, checks = 0
const check = (a, b) => { assert.deepEqual(a, b); checks++ }
try {
  family = await db.family.create({ data: { name: 'Chapter MCP test ' + suffix } })
  const user = await db.user.create({ data: { email: suffix + '@example.invalid', password: 'disabled', familyId: family.id } })
  const other = await db.user.create({ data: { email: 'other-' + suffix + '@example.invalid', password: 'disabled', familyId: family.id } })
  const project = await db.project.create({ data: { title: 'Synthetic chapter fixtures', userId: user.id } })
  const foreign = await db.project.create({ data: { title: 'Private fixture', userId: other.id } })
  clientId = 'chapter-' + suffix
  await db.oAuthClient.create({ data: { id: clientId, name: 'Chapter test', redirectUris: [origin + '/callback'] } })
  const token = randomBytes(32).toString('hex')
  await db.oAuthAccessToken.create({ data: { clientId, userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), resource, scope: 'mythos:read mythos:write', expiresAt: new Date(Date.now() + 3600000) } })
  sdk = new Client({ name: 'chapter-regressions', version: '1.0' })
  await sdk.connect(new StreamableHTTPClientTransport(new URL(resource), { requestInit: { headers: { authorization: 'Bearer ' + token } } }))
  const call = async (name, args, error = false) => {
    const result = await sdk.callTool({ name: 'mythos_' + name, arguments: args })
    check(result.isError, error)
    check(result.content[0].type, 'text')
    assert.ok(result.content[0].text.length)
    return JSON.parse(result.content[0].text)
  }
  const read = async id => {
    let out = await call('chapter', { projectId: project.id, id })
    if (out.serialization !== 'json-chunks') return out
    let all = out.chunk
    while (out.nextPage) { out = await call('chapter', { projectId: project.id, id, page: out.nextPage, expectedUpdatedAt: out.updatedAt }); all += out.chunk }
    return JSON.parse(all)
  }
  const cookie = 'auth-token=' + jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })
  const approve = async (id, status = 200) => {
    const response = await fetch(origin + '/api/integrations/approvals/' + id, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'approve' }) })
    check(response.status, status)
    return response.json()
  }
  const listed = await sdk.listTools()
  const editsTool = listed.tools.find(t => t.name === 'mythos_propose_chapter_text_edits')
  check(editsTool.inputSchema.required, ['projectId', 'chapterId', 'expectedUpdatedAt', 'title', 'edits'])
  check(editsTool.outputSchema.required, ['status'])
  check(listed.tools.find(t => t.name === 'mythos_chapter').inputSchema.properties.expectedUpdatedAt.format, 'date-time')
  const scope = { authorId: user.id, familyId: family.id, projectId: project.id }
  const character = await db.character.create({ data: { ...scope, name: 'Ada' } })
  const place = await db.place.create({ data: { ...scope, name: 'Hafen' } })
  const item = await db.item.create({ data: { ...scope, name: 'Ring' } })
  const chapter = await db.chapter.create({ data: { projectId: project.id, title: 'Protected fixture', content: '' } })
  const comment = await db.comment.create({ data: { authorId: user.id, familyId: family.id, chapterId: chapter.id, content: 'Kommentar bleibt.' } })
  const evidence = await db.sourceEvidence.create({ data: { chapterId: chapter.id, entityType: 'CHARACTER', entityId: character.id, statement: 'Synthetic quote anchor', quote: 'Öl 🦉', sourceHash: 'test', sourceUpdatedAt: new Date(), authorId: user.id, familyId: family.id } })
  const html = `<p class="original">Früh &amp; <strong>schön</strong> <span data-character-mention="" data-character-id="${character.id}">Ada</span> <span data-entity-mention="" data-entity-kind="PLACE" data-entity-id="${place.id}">Hafen</span> <span data-entity-mention="" data-entity-kind="ITEM" data-entity-id="${item.id}">Ring</span><mark data-comment-id="${comment.id}" data-comment-resolved="false">Anker</mark> danach.</p><p>Öl 🦉</p>`
  const tiptap = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Äpfel ', marks: [{ type: 'bold' }] }, { type: 'entityMention', attrs: { id: item.id, kind: 'ITEM', label: 'Ring' } }, { type: 'text', text: 'Anker', marks: [{ type: 'comment', attrs: { commentId: comment.id } }] }, { type: 'text', text: ' Ende.' }] }] }
  for (const content of ['', {}, { type: 'doc', content: [] }, '<p>Äpfel &amp; Öl</p><p>Absatz 🦉</p>', html, { content: html, metadata: { keep: true } }, tiptap, '<p>Ä 🦉</p>'.repeat(3000)]) {
    const fixture = await db.chapter.create({ data: { projectId: project.id, title: 'Read format', content } })
    const out = await read(fixture.id)
    check(out.content, content)
    check(typeof out.text, 'string')
    if (typeof content === 'string' && content) assert.ok(out.text.includes('Ä') || out.text.includes('Früh'))
    if (content === tiptap) check(out.text, 'Äpfel RingAnker Ende.\n')
    if (out.segments.some(s => !s.protected) && out.segments.length < 100) {
      const segment = out.segments.find(s => !s.protected)
      const candidate = await call('propose_chapter_update', { projectId: project.id, chapterId: fixture.id, title: fixture.title, expectedUpdatedAt: out.updatedAt, content: { type: 'chapterTextEdits', edits: [{ nodeId: segment.nodeId, before: segment.text, after: segment.text + ' Neu' }] } })
      check(candidate.status, 201)
      await approve(candidate.proposalId)
      const edited = await read(fixture.id)
      check(edited.segments.filter(s => s.protected), out.segments.filter(s => s.protected))
      assert.ok(edited.text.includes(segment.text + ' Neu'))
    }
  }
  // A long chapter, including live comment records, rewritten through the NEW
  // published tool, reviewed over the session API and approved transactionally.
  const original = html.replace('<p class="original">', '<p>') + '<p>' + 'Ausführliche alte Passage. '.repeat(500) + '</p><p>Unverändert &#38; Ende.</p>'
  for (const content of [original, { content: original, metadata: { keep: true } }, tiptap]) {
    await db.chapter.update({ where: { id: chapter.id }, data: { content } })
    const beforeRead = await read(chapter.id)
    const before = beforeRead.blocks.map(b => b.text).join('\n\n')
    const rewritten = content === tiptap ? before.replace(' Ende.', ' Neuer Schluss.') : before.replace('Früh & ', 'Später & ').replace('Ausführliche alte Passage. '.repeat(500), 'Gekürzt.')
    const after = rewritten + '\n\n' + 'Neu hinzugefügt. '.repeat(250)
    const args = { projectId: project.id, chapterId: chapter.id, title: chapter.title, expectedUpdatedAt: beforeRead.updatedAt, edits: [{ nodeId: `blocks.0-${beforeRead.blocks.length - 1}`, before, after }] }
    if (content !== tiptap) {
      const unsafe = await call('propose_chapter_text_edits', { ...args, edits: [{ ...args.edits[0], after: after.replace('Öl 🦉', 'Entfernt') }] }, true)
      check(unsafe.status, 409)
      assert.ok(unsafe.error.includes(evidence.id))
    }
    const proposed = await call('propose_chapter_text_edits', args)
    check(proposed.state, 'PENDING')
    check((await read(chapter.id)).content, content)
    const review = await fetch(origin + '/api/integrations/approvals', { headers: { cookie } })
    const pending = (await review.json()).proposals.find(p => p.id === proposed.proposalId)
    check(pending.canApply, true)
    assert.ok(pending.content.preview)
    if (typeof content === 'string') {
      const late = await db.sourceEvidence.create({ data: { chapterId: chapter.id, entityType: 'CHARACTER', entityId: character.id, statement: 'Anchor added after proposal', quote: 'Früh &', sourceHash: 'test', sourceUpdatedAt: new Date(), authorId: user.id, familyId: family.id } })
      const rejected = await approve(proposed.proposalId, 409)
      assert.ok(rejected.error.includes(late.id))
      check((await read(chapter.id)).content, content)
      check((await db.chapterProposal.findUnique({ where: { id: proposed.proposalId } })).status, 'PENDING')
      await db.sourceEvidence.delete({ where: { id: late.id } })
    }
    const accepted = await approve(proposed.proposalId)
    check(accepted.decision, 'APPLIED')
    check((await db.chapterVersion.findUnique({ where: { id: accepted.backupId } })).content, content)
    const final = await read(chapter.id)
    check(final.segments.filter(s => s.protected).map(s => s.text), beforeRead.segments.filter(s => s.protected).map(s => s.text))
    check(await db.comment.findUnique({ where: { id: comment.id } }), comment)
    check(await db.sourceEvidence.findUnique({ where: { id: evidence.id } }), evidence)
    if (typeof content === 'string' || typeof content.content === 'string') {
      const finalHtml = typeof final.content === 'string' ? final.content : final.content.content
      check(finalHtml.match(/<(?:span|mark)\b[^>]*>.*?<\/(?:span|mark)>/g), original.match(/<(?:span|mark)\b[^>]*>.*?<\/(?:span|mark)>/g))
      assert.ok(finalHtml.includes('<p>Unverändert &#38; Ende.</p>'))
      assert.ok(!finalHtml.includes('Ausführliche alte Passage'))
    }
    check((await call('propose_chapter_text_edits', args, true)).status, 409)
    await approve(proposed.proposalId, 409)
  }
  await db.chapter.update({ where: { id: chapter.id }, data: { content: { content: html, metadata: { keep: true } } } })
  let current = await read(chapter.id)
  const propose = (content, revision = current.updatedAt) => call('propose_chapter_update', { projectId: project.id, chapterId: chapter.id, title: 'Proposed', expectedUpdatedAt: revision, content })
  const before = current.segments.find(s => s.text === 'Früh & '), after = current.segments.find(s => s.text === ' danach.')
  const edits = { type: 'chapterTextEdits', edits: [{ nodeId: before.nodeId, before: before.text, after: 'Später & ' }, { nodeId: after.nodeId, before: after.text, after: ' zuletzt.' }] }
  const proposal = await propose(edits)
  check(proposal.status, 201)
  check((await read(chapter.id)).content, current.content)
  const listing = await fetch(origin + '/api/integrations/approvals', { headers: { cookie } })
  check(listing.status, 200)
  const stored = (await listing.json()).proposals.find(p => p.id === proposal.proposalId)
  check(stored.content.edits, edits.edits)
  check(stored.canApply, true)
  const applied = await approve(proposal.proposalId)
  check(applied.decision, 'APPLIED')
  const updated = await read(chapter.id)
  check(updated.content, { content: html.replace('Früh &amp; ', 'Später &amp; ').replace(' danach.', ' zuletzt.'), metadata: { keep: true } })
  check(await db.comment.findUnique({ where: { id: comment.id } }), comment)
  check((await db.chapterVersion.findUnique({ where: { id: applied.backupId } })).content, current.content)
  await approve(proposal.proposalId, 409)
  const common = { projectId: project.id, chapterId: chapter.id, expectedUpdatedAt: updated.updatedAt, title: 'Invalid' }
  const protectedSegment = updated.segments.find(s => s.protected)
  const conflict = await call('propose_chapter_update', { ...common, content: { type: 'chapterTextEdits', edits: [{ nodeId: protectedSegment.nodeId, before: protectedSegment.text, after: 'Changed' }] } }, true)
  check(conflict.status, 409); assert.match(conflict.error, /Protected text conflict/)
  const invalid = await call('propose_chapter_update', { ...common, content: '<p>HTML</p>' }, true)
  check(invalid.status, 400); assert.match(invalid.error, /HTML strings/)
  const replacement = await call('propose_chapter_update', { ...common, content: { type: 'doc', content: [] } }, true)
  check(replacement.status, 409); assert.match(replacement.error, /chapterTextEdits/)
  const segment = updated.segments.find(s => !s.protected)
  const nextEdits = { type: 'chapterTextEdits', edits: [{ nodeId: segment.nodeId, before: segment.text, after: 'Noch später ' }] }
  current = updated
  const expired = await propose(nextEdits)
  await db.chapterProposal.update({ where: { id: expired.proposalId }, data: { expiresAt: new Date(0) } })
  await approve(expired.proposalId, 410)
  const stale = await propose(nextEdits)
  await db.chapter.update({ where: { id: chapter.id }, data: { title: 'Interim revision' } })
  await approve(stale.proposalId, 409)
  check((await call('propose_chapter_update', { ...common, content: nextEdits }, true)).status, 409)
  const missing = await call('chapter', { projectId: project.id, id: 'missing-' + suffix }, true)
  assert.match(missing.error, /nicht gefunden/)
  await call('chapter', { projectId: foreign.id, id: chapter.id }, true)
  await db.chapter.update({ where: { id: chapter.id }, data: { content: { unsupported: true } } })
  assert.match((await call('chapter', { projectId: project.id, id: chapter.id }, true)).error, /Unsupported/)
  await db.oAuthAccessToken.updateMany({ where: { clientId }, data: { scope: 'mythos:read' } })
  await assert.rejects(() => sdk.callTool({ name: 'mythos_propose_chapter_update', arguments: { ...common, content: edits } }))
  await assert.rejects(() => sdk.callTool({ name: 'mythos_propose_chapter_text_edits', arguments: { ...common, edits: edits.edits } }))
  console.log(`PASS: chapter MCP SDK/HTTP, PostgreSQL, session review/approval: ${checks} assertions`)
} finally {
  if (sdk) await sdk.close()
  if (family) {
    await db.project.deleteMany({ where: { user: { familyId: family.id } } })
    await db.user.deleteMany({ where: { familyId: family.id } })
    await db.family.delete({ where: { id: family.id } })
  }
  if (clientId) await db.oAuthClient.deleteMany({ where: { id: clientId } })
  await db.$disconnect()
}
