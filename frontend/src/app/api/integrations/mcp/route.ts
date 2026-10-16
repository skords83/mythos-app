import { NextRequest, NextResponse } from 'next/server'
import { GET as readIntegration } from '../chatgpt/route'

// Experimental stateless MCP JSON-RPC endpoint. Bearer authentication is
// delegated to the read-only integration route. Not production-ready OAuth.
export const dynamic = 'force-dynamic'
const VERSION = '2025-03-26'
const actions = ['projects', 'chapters', 'chapter', 'characters', 'places', 'timeline', 'lore'] as const
type Action = typeof actions[number]
const tools = actions.map((action) => ({
  name: 'mythos_' + action,
  description: ({
    projects: 'List your Mythos projects',
    chapters: 'List chapter metadata for a project',
    chapter: 'Read a chapter with its Tiptap JSON content',
    characters: 'List visible characters for a project',
    places: 'List visible places for a project',
    timeline: 'List timeline events for a project',
    lore: 'List lore entries for a project',
  } as Record<Action, string>)[action],
  inputSchema: {
    type: 'object',
    properties: {
      ...(action === 'projects' ? {} : { projectId: { type: 'string' } }),
      ...(action === 'chapter' ? { id: { type: 'string' } } : {}),
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
    required: action === 'projects' ? [] : action === 'chapter' ? ['projectId', 'id'] : ['projectId'],
    additionalProperties: false,
  },
}))

const rpc = (id: unknown, result: unknown) => NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'no-store' } })
const fail = (id: unknown, code: number, message: string) => NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: NextRequest) {
  // Probe authentication before disclosing tool metadata.
  const probe = new URL(request.url)
  probe.searchParams.set('action', 'projects')
  probe.searchParams.set('limit', '1')
  const auth = await readIntegration(new NextRequest(probe, { headers: { authorization: request.headers.get('authorization') || '' } }))
  if (auth.status !== 200) return new NextResponse(null, { status: 401, headers: { 'Cache-Control': 'no-store' } })

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) return new NextResponse(null, { status: 415 })
  const declaredSize = Number(request.headers.get('content-length') || 0)
  if (declaredSize > 16384) return new NextResponse(null, { status: 413 })
  let msg: any
  try {
    const raw = await request.text()
    if (raw.length > 16384) return new NextResponse(null, { status: 413 })
    msg = JSON.parse(raw)
  } catch { return fail(null, -32700, 'Invalid JSON') }
  if (Array.isArray(msg)) return fail(null, -32600, 'Batch requests not supported')
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id ?? null, -32600, 'Invalid request')
  if (msg.method === 'notifications/initialized') return new NextResponse(null, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  if (!Object.prototype.hasOwnProperty.call(msg, 'id')) return fail(null, -32600, 'Request id required')
  if (msg.method === 'initialize') {
    const requestedVersion = msg.params?.protocolVersion
    if (typeof requestedVersion !== 'string') return fail(msg.id, -32602, 'protocolVersion required')
    return rpc(msg.id, {
    protocolVersion: requestedVersion === VERSION ? requestedVersion : VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: 'mythos-readonly', version: '0.1.0' },
  })
  }
  if (msg.method === 'ping') return rpc(msg.id, {})
  if (msg.method === 'tools/list') return rpc(msg.id, { tools })
  if (msg.method !== 'tools/call') return fail(msg.id, -32601, 'Method not found')

  const name = msg.params?.name
  const args = msg.params?.arguments
  if (typeof name !== 'string' || !name.startsWith('mythos_') || !actions.includes(name.slice(7) as Action)) return fail(msg.id, -32602, 'Unknown tool')
  if (!args || typeof args !== 'object' || Array.isArray(args)) return fail(msg.id, -32602, 'Invalid arguments')
  const action = name.slice(7) as Action
  const allowed = action === 'projects' ? ['page', 'limit'] : action === 'chapter' ? ['projectId', 'id', 'page', 'limit'] : ['projectId', 'page', 'limit']
  if (Object.keys(args).some((k) => !allowed.includes(k))) return fail(msg.id, -32602, 'Unexpected argument')
  if (action !== 'projects' && (typeof args.projectId !== 'string' || !args.projectId)) return fail(msg.id, -32602, 'projectId required')
  if (action === 'chapter' && (typeof args.id !== 'string' || !args.id)) return fail(msg.id, -32602, 'id required')
  if (args.page !== undefined && (!Number.isInteger(args.page) || args.page < 1 || args.page > 10000)) return fail(msg.id, -32602, 'Invalid page')
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)) return fail(msg.id, -32602, 'Invalid limit')

  const url = new URL(request.url)
  url.searchParams.set('action', action)
  for (const key of allowed) if (args[key] !== undefined) url.searchParams.set(key, String(args[key]))
  const response = await readIntegration(new NextRequest(url, { headers: { authorization: request.headers.get('authorization') || '' } }))
  const data = await response.json()
  return rpc(msg.id, {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    isError: !response.ok,
  })
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } })
}
