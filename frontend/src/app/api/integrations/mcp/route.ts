import { universeTools } from '@/lib/universe-schema'
import { storyTools } from '@/lib/story-tool-schema'
import { callMcpStory } from '@/lib/mcp-story'
import { entityWriteTools, writeMcpEntity } from '@/lib/mcp-entity-write'
import { createPendingChapterProposal } from '@/lib/integration-chapter-proposal-store'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { authenticateMcp } from '@/lib/mcp-auth'
import { oauthConfig } from '@/lib/oauth-config'
import { boundedBody } from '@/lib/bounded-body'
import { GET as readIntegration } from '../chatgpt/route'

// Stateless Streamable HTTP using JSON responses; no server-push SSE or sessions.
export const dynamic = 'force-dynamic'
const VERSION = '2025-11-25'
const VERSIONS = ['2025-03-26', '2025-06-18', VERSION]
const actions = ['projects', 'chapters', 'chapter', 'characters', 'places', 'timeline', 'lore', 'items', 'factions'] as const
type Action = typeof actions[number]
const tools = actions.map((action) => ({
  name: 'mythos_' + action,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read'] }],
  _meta: { securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read'] }] },
  description: ({
    projects: 'List your Mythos projects',
    chapters: 'List chapter metadata for a project',
    chapter: 'Read a chapter with its Tiptap JSON content',
    characters: 'List visible characters for a project',
    places: 'List visible places for a project',
    timeline: 'List timeline events for a project',
    items: 'List visible items with all content fields, IDs, updatedAt and visible relations for an owned project',
    factions: 'List visible factions with all content fields, IDs, updatedAt and visible relations (including membership) for an owned project',
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

const proposalTool = {
  name: 'mythos_propose_chapter_update',
  description: 'Propose a replacement title and Tiptap document for an owned chapter. Read the chapter first and pass its updatedAt as expectedUpdatedAt. Creates a pending proposal only; the user must review and approve it in Mythos before the chapter changes. Proposals expire after 24 hours.',
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read', 'mythos:write'] }],
  _meta: { securitySchemes: [{ type: 'oauth2', scopes: ['mythos:read', 'mythos:write'] }] },
  inputSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      projectId: { type: 'string', minLength: 1, maxLength: 128 },
      chapterId: { type: 'string', minLength: 1, maxLength: 128 },
      expectedUpdatedAt: { type: 'string', format: 'date-time' },
      title: { type: 'string', minLength: 1, maxLength: 300 },
      content: { type: 'object', properties: { type: { const: 'doc' }, content: { type: 'array', items: { type: 'object' } } }, required: ['type', 'content'] },
    },
    required: ['projectId', 'chapterId', 'expectedUpdatedAt', 'title', 'content'],
  },
}

const rpc = (id: unknown, result: unknown) => NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'no-store' } })
const fail = (id: unknown, code: number, message: string) => NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(getClientIp(request), 'mcp:read', { limit: 300, windowMs: 60000, failClosed: true })
  if (limited) return limited
  const transportError = validateTransport(request)
  if (transportError) return transportError
  let auth
  try { auth = await authenticateMcp(request) } catch { return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
  if (auth) return auth
  const accept = request.headers.get('accept') || ''
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) return new NextResponse(null, { status: 406 })

  const contentType = request.headers.get('content-type') || ''
  if (contentType.split(';')[0].trim().toLowerCase() !== 'application/json') return new NextResponse(null, { status: 415 })
  const declaredSize = Number(request.headers.get('content-length') || 0)
  if (declaredSize > 2097152) return new NextResponse(null, { status: 413 })
  let msg: any
  try {
    const raw = await boundedBody(request, 2097152)
    msg = JSON.parse(raw)
  } catch (error) {
    if (error instanceof Error && error.message === 'body_limit') return new NextResponse(null, { status: 413 })
    return fail(null, -32700, 'Invalid JSON')
  }
  if (Array.isArray(msg)) return fail(null, -32600, 'Batch requests not supported')
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id ?? null, -32600, 'Invalid request')
  if (!Object.prototype.hasOwnProperty.call(msg, 'id')) {
    // Notifications have no response, including unknown extension notifications.
    if (!msg.method.startsWith('notifications/')) return new NextResponse(null, { status: 400 })
    return new NextResponse(null, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  }
  if ((typeof msg.id !== 'string' && typeof msg.id !== 'number') || (typeof msg.id === 'number' && !Number.isInteger(msg.id))) return fail(null, -32600, 'Invalid request id')
  if (msg.params !== undefined && (!msg.params || typeof msg.params !== 'object' || Array.isArray(msg.params))) return fail(msg.id, -32602, 'Invalid params')
  if (msg.method === 'initialize') {
    const requestedVersion = msg.params?.protocolVersion
    if (typeof requestedVersion !== 'string') return fail(msg.id, -32602, 'protocolVersion required')
    return rpc(msg.id, {
      protocolVersion: VERSIONS.includes(requestedVersion) ? requestedVersion : VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'mythos', version: '0.4.0' },
    })
  }
  if (msg.method === 'ping') return rpc(msg.id, {})
  if (msg.method === 'tools/list') return rpc(msg.id, { tools: [...tools, proposalTool, ...entityWriteTools, ...storyTools, ...universeTools] })
  if (msg.method !== 'tools/call') return fail(msg.id, -32601, 'Method not found')

  const name = msg.params?.name
  const args = msg.params?.arguments ?? {}
  const storyTool = [...storyTools, ...universeTools].find(tool => tool.name === name)
  if (storyTool) {
    try {
      const denied = await authenticateMcp(request, storyTool.annotations.readOnlyHint ? 'mythos:read' : 'mythos:write')
      if (denied) return denied
      const outcome = await callMcpStory(request.headers.get('authorization'), name, args)
      const result = { content: [{ type: 'text', text: JSON.stringify(outcome) }], isError: outcome.status >= 400 }
      if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 262144) return rpc(msg.id, { content: [{ type: 'text', text: 'Ergebnis zu groß. Bitte limit reduzieren.' }], isError: true })
      return rpc(msg.id, result)
    } catch { return fail(msg.id, -32603, 'Story service unavailable') }
  }
  if (entityWriteTools.some(tool => tool.name === name)) {
    try {
      const denied = await authenticateMcp(request, 'mythos:write')
      if (denied) return denied
      const outcome = await writeMcpEntity(request.headers.get('authorization'), name, args)
      return rpc(msg.id, { content: [{ type: 'text', text: JSON.stringify(outcome) }], isError: outcome.status >= 400 })
    } catch { return fail(msg.id, -32603, 'Write service unavailable') }
  }
  if (name === proposalTool.name) {
    try {
      const denied = await authenticateMcp(request, 'mythos:write')
      if (denied) return denied
      if (!args || typeof args !== 'object' || Array.isArray(args) ||
          Object.keys(args).some(key => !proposalTool.inputSchema.required.includes(key))) {
        return fail(msg.id, -32602, 'Invalid proposal arguments')
      }
      const outcome = await createPendingChapterProposal(request.headers.get('authorization'), args)
      return rpc(msg.id, {
        content: [{ type: 'text', text: JSON.stringify(outcome.status === 201
          ? { ...outcome, state: 'PENDING', approvalUrl: oauthConfig().issuer + '/integrations/approvals', message: 'Review and approve this proposal in Mythos before it is applied.' }
          : outcome) }],
        isError: outcome.status !== 201,
      })
    } catch { return fail(msg.id, -32603, 'Proposal service unavailable') }
  }
  if (typeof name !== 'string'  || !name.startsWith('mythos_') || !actions.includes(name.slice(7) as Action)) return fail(msg.id, -32602, 'Unknown tool')
  if (!args || typeof args !== 'object' || Array.isArray(args)) return fail(msg.id, -32602, 'Invalid arguments')
  const action = name.slice(7) as Action
  const allowed = action === 'projects' ? ['page', 'limit'] : action === 'chapter' ? ['projectId', 'id', 'page', 'limit'] : ['projectId', 'page', 'limit']
  if (Object.keys(args).some((k) => !allowed.includes(k))) return fail(msg.id, -32602, 'Unexpected argument')
  if (action !== 'projects' && (typeof args.projectId !== 'string' || !args.projectId)) return fail(msg.id, -32602, 'projectId required')
  if (action === 'chapter' && (typeof args.id !== 'string' || !args.id)) return fail(msg.id, -32602, 'id required')
  if (args.page !== undefined && (!Number.isInteger(args.page) || args.page < 1 || args.page > 10000)) return fail(msg.id, -32602, 'Invalid page')
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)) return fail(msg.id, -32602, 'Invalid limit')

  const url = new URL(oauthConfig().resource)
  url.searchParams.set('action', action)
  for (const key of allowed) if (args[key] !== undefined) url.searchParams.set(key, String(args[key]))
  let response: Response
  try { response = await readIntegration(new NextRequest(url, { headers: { authorization: request.headers.get('authorization') || '' } })) } catch { return fail(msg.id, -32603, 'Data service unavailable') }
  if (response.status === 401) return new NextResponse(null, { status: 401, headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': `Bearer resource_metadata="${oauthConfig().metadata}", error="invalid_token"` } })
  const raw = await response.text()
  const tooLarge = () => rpc(msg.id, {
    content: [{ type: 'text', text: 'Result exceeds 256 KiB. Reduce limit for lists; oversized single chapters cannot be returned.' }],
    isError: true,
  })
  if (Buffer.byteLength(raw, 'utf8') > 262144) return tooLarge()
  const result = { content: [{ type: 'text', text: raw }], isError: !response.ok }
  // Include JSON escaping, envelope and caller-supplied id in the wire-size bound.
  if (Buffer.byteLength(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }), 'utf8') > 262144) return tooLarge()
  return rpc(msg.id, result)
}

function validateTransport(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== oauthConfig().issuer) return new NextResponse(null, { status: 403 })
  const version = request.headers.get('mcp-protocol-version')
  if (version && !VERSIONS.includes(version)) return new NextResponse(null, { status: 400 })
  return null
}

export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(getClientIp(request), 'mcp:read', { limit: 300, windowMs: 60000, failClosed: true })
  if (limited) return limited
  const invalid = validateTransport(request)
  if (invalid) return invalid
  try {
    const auth = await authenticateMcp(request)
    if (auth) return auth
  } catch { return new NextResponse(null, { status: 503 }) }
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } })
}
export const DELETE = GET
