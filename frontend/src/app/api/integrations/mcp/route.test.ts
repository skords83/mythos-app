/** @jest-environment node */
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
test('passes project-scoped requests to the read-only data layer', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
    name: 'mythos_characters', arguments: { projectId: 'project-1', limit: 10 },
  } }))
  expect((await response.json()).result.isError).toBe(false)
  const called = read.mock.calls[0][0] as NextRequest
  expect(called.nextUrl.searchParams.get('action')).toBe('characters')
  expect(called.nextUrl.searchParams.get('projectId')).toBe('project-1')
})
test('rejects malformed page argument', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: {
    name: 'mythos_projects', arguments: { page: -1 },
  } }))
  expect((await response.json()).error.code).toBe(-32602)
})

test('rejects oversized JSON-RPC request bodies', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 5, method: 'ping', padding: 'x'.repeat(20000) }))
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
