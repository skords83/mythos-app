/** Real HTTP + PostgreSQL + official MCP SDK. Never runs against a remote database/server. */
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import Redis from 'ioredis'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const dbUrl = new URL(process.env.DATABASE_URL || 'file:///missing')
const origin = process.env.MYTHOS_OAUTH_ISSUER
assert.equal(process.env.MYTHOS_RUN_MCP_INTEGRATION, '1', 'Explicit test opt-in required')
assert.equal(dbUrl.hostname, '127.0.0.1', 'Refusing non-loopback DB')
assert.equal(dbUrl.port, '55432', 'Refusing non-test DB port')
assert.equal(dbUrl.pathname, '/mythos_integration_test', 'Refusing non-test database')
assert.equal(origin, 'http://localhost:4000', 'Refusing non-local HTTP server')
assert.equal(process.env.REDIS_URL, 'redis://127.0.0.1:56379', 'Refusing non-test Redis')
const resource = origin + '/api/integrations/mcp'
const prisma = new PrismaClient()
const suffix = randomBytes(10).toString('hex')
const clientId = 'mcp-http-' + suffix
const redirectUri = origin + '/oauth/test-callback'
const verifier = randomBytes(48).toString('base64url')
const challenge = createHash('sha256').update(verifier).digest('base64url')
const hash = value => createHash('sha256').update(value).digest('hex')
let family, user, other, project, otherProject, chapter, cookie, token, sdk
let assertions = 0
const check = (actual, expected) => { assert.deepEqual(actual, expected); assertions++ }
const request = (path, options) => fetch(origin + path, { ...options, redirect: 'manual' })
const authorizeParams = () => ({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', scope: 'mythos:read', state: 'test-state-' + suffix, resource })
const consent = (overrides = {}, session = cookie) => request('/api/oauth/authorize', { method: 'POST', headers: { cookie: session || '', origin, 'content-type': 'application/json' }, body: JSON.stringify({ ...authorizeParams(), consent: true, ...overrides }) })
const exchange = (code, overrides = {}) => request('/api/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier, code, resource, ...overrides }) })
const rpc = (method, params, bearer = token, headers = {}) => request('/api/integrations/mcp', { method: 'POST', headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json', ...(bearer ? { authorization: 'Bearer ' + bearer } : {}), ...headers }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }) })
const tool = async (name, args) => {
  const response = await rpc('tools/call', { name: 'mythos_' + name, arguments: args })
  check(response.status, 200)
  const { result } = await response.json()
  return { ...result, data: JSON.parse(result.content[0].text) }
}
try {
  family = await prisma.family.create({ data: { name: 'MCP test ' + suffix } })
  const password = randomBytes(24).toString('hex')
  user = await prisma.user.create({ data: { email: suffix + '@example.invalid', password: await bcrypt.hash(password, 10), familyId: family.id, role: 'OWNER' } })
  other = await prisma.user.create({ data: { email: 'other-' + suffix + '@example.invalid', password: 'disabled', familyId: family.id } })
  project = await prisma.project.create({ data: { title: 'MCP fixture', userId: user.id } })
  otherProject = await prisma.project.create({ data: { title: 'Foreign project', userId: other.id } })
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ein lokales Testkapitel.' }] }] }
  chapter = await prisma.chapter.create({ data: { projectId: project.id, title: 'Testkapitel', content } })
  const foreignChapter = await prisma.chapter.create({ data: { projectId: otherProject.id, title: 'Secret', content } })
  await prisma.oAuthClient.create({ data: { id: clientId, name: 'Local MCP HTTP test', redirectUris: [redirectUri] } })
  await prisma.character.createMany({ data: [
    { name: 'Visible', projectId: project.id, familyId: family.id, authorId: user.id },
    { name: 'Hidden', projectId: project.id, familyId: family.id, authorId: other.id },
    { name: 'Shared', visibility: 'FAMILY', projectId: project.id, familyId: family.id, authorId: other.id },
  ] })
  // Discovery and standard authentication challenge, before login.
  let response = await rpc('tools/list', null, '')
  check(response.status, 401)
  assert.match(response.headers.get('www-authenticate'), /resource_metadata=/)
  for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/api/integrations/mcp']) {
    response = await request(path)
    check(response.status, 200)
    check((await response.json()).resource, resource)
  }
  const metadata = await (await request('/.well-known/oauth-authorization-server')).json()
  check(metadata.issuer, origin)
  check(metadata.token_endpoint_auth_methods_supported, ['none'])
  check(metadata.code_challenge_methods_supported, ['S256'])
  check((await consent({}, '')).status, 401)
  response = await request('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'login', email: user.email, password }) })
  check(response.status, 200)
  cookie = response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie?.startsWith('auth-token='), 'Login must issue real session cookie')
  response = await request('/api/oauth/authorize?' + new URLSearchParams(authorizeParams()))
  check(response.status, 200)
  check((await response.json()).client_name, 'Local MCP HTTP test')
  for (const overrides of [{ resource: 'https://wrong.invalid/mcp' }, { scope: 'mythos:write' }, { redirect_uri: 'https://evil.invalid/cb' }, { code_challenge_method: 'plain' }, { consent: false }]) check((await consent(overrides)).status, 400)
  response = await consent()
  check(response.status, 200)
  const destination = new URL((await response.json()).redirect_to)
  check(destination.searchParams.get('state'), authorizeParams().state)
  check(destination.searchParams.get('iss'), origin)
  const code = destination.searchParams.get('code')
  assert.ok(code)
  check((await exchange(code, { code_verifier: verifier + 'bad' })).status, 400)
  check((await exchange(code, { resource: 'https://wrong.invalid/mcp' })).status, 400)
  check((await exchange(code, { redirect_uri: 'https://wrong.invalid/cb' })).status, 400)
  // A real concurrent redemption must yield exactly one success.
  const exchanges = await Promise.all([exchange(code), exchange(code)])
  check(exchanges.map(r => r.status).sort(), [200, 400])
  const issued = await exchanges.find(r => r.status === 200).json()
  check(issued.scope, 'mythos:read')
  check(issued.expires_in, 3600)
  token = issued.access_token
  const stored = await prisma.oAuthAccessToken.findUniqueOrThrow({ where: { tokenHash: hash(token) } })
  check(stored.resource, resource)
  check((await exchange(code)).status, 400)
  // Official SDK verifies initialization, notifications, schemas and transport interoperability.
  sdk = new Client({ name: 'mythos-http-integration-test', version: '1.0.0' })
  await sdk.connect(new StreamableHTTPClientTransport(new URL(resource), { requestInit: { headers: { authorization: 'Bearer ' + token } } }))
  check(sdk.getServerVersion().name, 'mythos-readonly')
  const list = await sdk.listTools()
  check(list.tools.length, 14)
  check(list.tools.filter(t => t.annotations?.readOnlyHint === true).length, 7)
  const projects = await sdk.callTool({ name: 'mythos_projects', arguments: {} })
  check(JSON.parse(projects.content[0].text).map(p => p.id), [project.id])
  check((await tool('chapters', { projectId: project.id })).data[0].id, chapter.id)
  check((await tool('chapter', { projectId: project.id, id: chapter.id })).data.content, content)
  check((await tool('characters', { projectId: project.id })).data.map(c => c.name).sort(), ['Shared', 'Visible'])
  for (const name of ['places', 'timeline', 'lore']) check((await tool(name, { projectId: project.id })).data, [])
  check((await tool('chapters', { projectId: otherProject.id })).isError, true)
  check((await tool('chapter', { projectId: project.id, id: foreignChapter.id })).isError, true)
  check((await (await rpc('tools/call', { name: 'mythos_delete', arguments: {} })).json()).error.code, -32602)
  check((await rpc('ping', null, token, { origin: 'https://evil.invalid' })).status, 403)
  check((await rpc('ping', null, token, { 'mcp-protocol-version': 'invalid' })).status, 400)
  check((await rpc('tools/list', null, 'invalid')).status, 401)
  for (const [change, status] of [[{ expiresAt: new Date(0) }, 401], [{ revokedAt: new Date() }, 401], [{ resource: 'https://wrong.invalid/mcp' }, 401], [{ resource: null }, 401], [{ scope: 'mythos:write' }, 403], [{ scope: 'mythos:read mythos:delete' }, 403]]) {
    await prisma.oAuthAccessToken.update({ where: { id: stored.id }, data: change })
    response = await rpc('tools/list')
    check(response.status, status)
    assert.match(response.headers.get('www-authenticate'), status === 403 ? /insufficient_scope/ : /invalid_token/)
    await prisma.oAuthAccessToken.update({ where: { id: stored.id }, data: { expiresAt: stored.expiresAt, revokedAt: null, resource, scope: 'mythos:read' } })
  }
  // Rate limiting through the actual Redis-backed HTTP handler. Unique test identity only.
  const redis = new Redis(process.env.REDIS_URL)
  const rateIp = 'mcp-fixture-' + suffix
  const rateKey = 'ratelimit:mcp:read:' + rateIp
  try {
    await redis.set(rateKey, '300', 'EX', 60)
    response = await rpc('ping', null, token, { 'x-forwarded-for': rateIp })
    check(response.status, 429)
    assert.ok(response.headers.get('retry-after'))
  } finally { await redis.del(rateKey); await redis.quit() }
  // Revocation through the authenticated account endpoint takes immediate effect.
  response = await request('/api/oauth/revoke', { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ tokenId: stored.id }) })
  check(response.status, 200)
  check((await rpc('tools/list')).status, 401)
  check((await prisma.chapter.findUniqueOrThrow({ where: { id: chapter.id } })).content, content)
  console.log(`PASS: ${assertions} HTTP/OAuth/MCP/database checks, including official MCP SDK; no production access.`)
} finally {
  if (sdk) await sdk.close()
  // Delete only this run's fixtures, never reset or truncate the database.
  await prisma.oAuthClient.deleteMany({ where: { id: clientId } })
  if (family) await prisma.family.delete({ where: { id: family.id } })
  await prisma.$disconnect()
}
