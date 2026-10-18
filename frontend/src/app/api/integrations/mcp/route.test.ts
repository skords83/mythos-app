/** @jest-environment node */
import { universeTools } from '@/lib/universe-schema'
import { createPendingChapterProposal } from '@/lib/integration-chapter-proposal-store'
jest.mock('@/lib/rateLimit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null), getClientIp: () => 'test' }))
import { NextRequest } from 'next/server'
import { authenticateMcp } from '@/lib/mcp-auth'
import { POST, GET, DELETE } from './route'
import { GET as readIntegration } from '../chatgpt/route'

jest.mock('@/lib/mcp-auth', () => ({ authenticateMcp: jest.fn() }))
jest.mock('../chatgpt/route', () => ({
  GET: jest.fn(),
}))
const read = readIntegration as jest.Mock
const endpoint = 'https://example.test/api/integrations/mcp'
const request = (body: unknown, bearer = 'Bearer test') => new NextRequest(endpoint, {
  method: 'POST',
  headers: { accept: 'application/json, text/event-stream', authorization: bearer, 'content-type': 'application/json' },
  body: JSON.stringify(body),
})
beforeEach(() => {
  process.env.MYTHOS_OAUTH_ISSUER = 'https://example.test'
  jest.clearAllMocks()
  ;(authenticateMcp as jest.Mock).mockResolvedValue(null)
  read.mockImplementation(async (req: NextRequest) =>
    Response.json(req.nextUrl.searchParams.get('action') === 'projects' ? [] : [{ id: 'entry-1' }]))
})

test('denies unauthenticated requests before MCP metadata disclosure', async () => {
  ;(authenticateMcp as jest.Mock).mockResolvedValueOnce(new Response(null, { status: 401 }))
  expect((await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))).status).toBe(401)
})
test('advertises read-only tools', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
  const json = await response.json()
  expect(json.result.tools.map((tool: { name: string }) => tool.name)).toContain('mythos_chapter')
  expect(json.result.tools.map((tool: { name: string }) => tool.name)).not.toContain('mythos_delete')
})
test('rejects unknown tools without invoking data access', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'mythos_delete', arguments: {} } }))
  expect((await response.json()).error.code).toBe(-32602)
  expect(read).not.toHaveBeenCalled()
})
test.each(['characters', 'items', 'factions'])('passes project-scoped %s requests to the read-only data layer', async action => {
  const response = await POST(request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
    name: `mythos_${action}`, arguments: { projectId: 'project-1', limit: 10 },
  } }))
  expect((await response.json()).result.isError).toBe(false)
  const called = read.mock.calls[0][0] as NextRequest
  expect(called.nextUrl.searchParams.get('action')).toBe(action)
  expect(called.nextUrl.searchParams.get('projectId')).toBe('project-1')
})
test('rejects malformed page argument', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: {
    name: 'mythos_projects', arguments: { page: -1 },
  } }))
  expect((await response.json()).error.code).toBe(-32602)
})

test('rejects oversized JSON-RPC request bodies', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 5, method: 'ping', padding: 'x'.repeat(2100000) }))
  expect(response.status).toBe(413)
})
test('rejects JSON-RPC batch requests explicitly', async () => {
  const response = await POST(request([{ jsonrpc: '2.0', id: 1, method: 'ping' }]))
  expect((await response.json()).error.code).toBe(-32600)
})

test('negotiates supported MCP protocol version', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 6, method: 'initialize', params: {
    protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' },
  } }))
  const json = await response.json()
  expect(json.result.protocolVersion).toBe('2025-03-26')
  expect(json.result.capabilities.tools).toEqual({})
})
test('rejects missing MCP protocol version on initialize', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 7, method: 'initialize', params: {} }))
  expect((await response.json()).error.code).toBe(-32602)
})

test.each(['2025-06-18', '2025-11-25'])('negotiates %s', async protocolVersion => {
  const res = await POST(request({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion } }))
  expect((await res.json()).result.protocolVersion).toBe(protocolVersion)
})
test('returns a supported version for an unknown client version', async () => {
  const res = await POST(request({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2099-01-01' } }))
  expect((await res.json()).result.protocolVersion).toBe('2025-11-25')
})
test('rejects unsupported protocol headers and cross-origin requests', async () => {
  const req = request({ jsonrpc: '2.0', id: 1, method: 'ping' })
  req.headers.set('mcp-protocol-version', 'bogus')
  expect((await POST(req)).status).toBe(400)
  req.headers.delete('mcp-protocol-version')
  req.headers.set('origin', 'https://evil.example')
  expect((await POST(req)).status).toBe(403)
  expect(authenticateMcp).not.toHaveBeenCalled()
})
test('requires both Streamable HTTP accept types', async () => {
  const req = request({ jsonrpc: '2.0', id: 1, method: 'ping' })
  req.headers.set('accept', 'text/plain')
  expect((await POST(req)).status).toBe(406)
})
test('acknowledges notifications with an empty 202', async () => {
  const res = await POST(request({ jsonrpc: '2.0', method: 'notifications/initialized' }))
  expect(res.status).toBe(202)
  expect(await res.text()).toBe('')
})
test('does not advertise server-push streams or sessions', async () => {
  expect((await GET(request({}))).status).toBe(405)
  expect((await DELETE(request({}))).status).toBe(405)
})
test('caps serialized tool output without returning partial JSON', async () => {
  read.mockResolvedValueOnce(Response.json({ content: 'x'.repeat(270000) }))
  const res = await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mythos_projects' } }))
  expect((await res.json()).result.isError).toBe(true)
})
test('does not let URL query parameters override validated tool arguments', async () => {
  const req = new NextRequest(endpoint + '?projectId=other&id=secret', {
    method: 'POST', headers: { authorization: 'Bearer test', accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mythos_projects' } }),
  })
  await POST(req)
  expect(read.mock.calls[0][0].nextUrl.searchParams.has('projectId')).toBe(false)
})
test.each([null, {}, [], true])('rejects invalid request IDs %p', async id => {
  const res = await POST(request({ jsonrpc: '2.0', id, method: 'ping' }))
  expect((await res.json()).error.code).toBe(-32600)
})

jest.mock('@/lib/integration-chapter-proposal-store', () => ({ createPendingChapterProposal: jest.fn() }))
test('advertises the proposal tool as a non-idempotent write requiring both scopes', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
  const tool = (await response.json()).result.tools.find((t: { name: string }) => t.name === 'mythos_propose_chapter_update')
  expect(tool.annotations).toMatchObject({ readOnlyHint: false, idempotentHint: false })
  expect(tool.securitySchemes[0].scopes).toEqual(['mythos:read', 'mythos:write'])
})
const proposalCall = { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'mythos_propose_chapter_update', arguments: {
  projectId: 'p', chapterId: 'c', expectedUpdatedAt: '2026-01-01T00:00:00.000Z', title: 'New title', content: { type: 'doc', content: [] },
} } }
test('blocks read-only credentials before proposal creation', async () => {
  ;(authenticateMcp as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(new Response(null, { status: 403 }))
  expect((await POST(request(proposalCall))).status).toBe(403)
  expect(createPendingChapterProposal).not.toHaveBeenCalled()
})
test('creates a pending proposal using the original bearer and revision', async () => {
  ;(createPendingChapterProposal as jest.Mock).mockResolvedValueOnce({ status: 201, proposalId: 'proposal' })
  const response = await POST(request(proposalCall))
  const result = (await response.json()).result
  expect(result.isError).toBe(false)
  expect(JSON.parse(result.content[0].text).state).toBe('PENDING')
  expect(authenticateMcp).toHaveBeenLastCalledWith(expect.anything(), 'mythos:write')
  expect(createPendingChapterProposal).toHaveBeenCalledWith('Bearer test', proposalCall.params.arguments)
  expect(read).not.toHaveBeenCalled()
})
test('returns stale revision conflicts as tool errors', async () => {
  ;(createPendingChapterProposal as jest.Mock).mockResolvedValueOnce({ status: 409, error: 'Chapter changed since last read' })
  expect((await (await POST(request(proposalCall))).json()).result.isError).toBe(true)
})

jest.mock('@/lib/mcp-entity-write', () => {
  const actual = jest.requireActual('@/lib/mcp-entity-write')
  return { ...actual, writeMcpEntity: jest.fn() }
})
import { entityWriteTools, writeMcpEntity } from '@/lib/mcp-entity-write'
test.each(entityWriteTools.map(tool => tool.name))('enforces write scope for %s', async name => {
  ;(authenticateMcp as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(new Response(null, { status: 403 }))
  const response = await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {} } }))
  expect(response.status).toBe(403)
  expect(writeMcpEntity).not.toHaveBeenCalled()
})
test('advertises all entity writes with OAuth write metadata', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
  const list = (await response.json()).result.tools
  for (const tool of entityWriteTools) {
    expect(list).toContainEqual(expect.objectContaining({ name: tool.name, annotations: expect.objectContaining({ readOnlyHint: false }), securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read', 'mythos:write'] }] }))
  }
})
test.each([200, 201, 400, 404, 409])('returns entity write status %s as a tool result', async status => {
  ;(writeMcpEntity as jest.Mock).mockResolvedValueOnce({ status })
  const args = { projectId: 'p', name: 'Name' }
  const response = await POST(request({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mythos_create_character', arguments: args } }))
  expect((await response.json()).result.isError).toBe(status >= 400)
  expect(writeMcpEntity).toHaveBeenCalledWith('Bearer test', 'mythos_create_character', args)
})

test('registers all universe tools with their schemas and OAuth capabilities', async () => {
 const response=await POST(request({jsonrpc:'2.0',id:101,method:'tools/list'}))
 const tools=(await response.json()).result.tools
 for(const tool of universeTools) expect(tools.find((t:{name:string})=>t.name===tool.name)).toEqual(tool)
})
