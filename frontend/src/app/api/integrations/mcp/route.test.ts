/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST } from './route'
import { GET as readIntegration } from '../chatgpt/route'

jest.mock('../chatgpt/route', () => ({
  GET: jest.fn(),
}))
const read = readIntegration as jest.Mock
const endpoint = 'https://example.test/api/integrations/mcp'
const request = (body: unknown, bearer = 'Bearer test') => new NextRequest(endpoint, {
  method: 'POST',
  headers: { authorization: bearer, 'content-type': 'application/json' },
  body: JSON.stringify(body),
})
beforeEach(() => {
  jest.clearAllMocks()
  read.mockImplementation(async (req: NextRequest) =>
    Response.json(req.nextUrl.searchParams.get('action') === 'projects' ? [] : [{ id: 'entry-1' }]))
})

test('denies unauthenticated requests before MCP metadata disclosure', async () => {
  read.mockResolvedValueOnce(Response.json({ error: 'Unauthorized' }, { status: 401 }))
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
  expect(read).toHaveBeenCalledTimes(1) // auth probe only
})
test('passes project-scoped requests to the read-only data layer', async () => {
  const response = await POST(request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
    name: 'mythos_characters', arguments: { projectId: 'project-1', limit: 10 },
  } }))
  expect((await response.json()).result.isError).toBe(false)
  const called = read.mock.calls[1][0] as NextRequest
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
