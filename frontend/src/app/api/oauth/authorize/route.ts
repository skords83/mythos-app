import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { oauthConfig, validResource } from '@/lib/oauth-config'
import { boundedBody } from '@/lib/bounded-body'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { issueOpaqueCredential } from '@/lib/oauth-credentials'
import { isValidPkceChallenge, matchesRegisteredRedirectUri } from '@/lib/oauth-pkce'

export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

// Authorization codes are issued only after an authenticated, explicit consent POST.
// The client and exact redirect URI must already be registered by the administrator.
export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(getClientIp(request), 'oauth:authorize', { limit: 120, windowMs: 60000, failClosed: true })
  if (limited) return limited
  const userId = await getUserFromRequest(request)
  if (!userId) return json({ error: 'login_required' }, 401)
  if (request.headers.get('origin') !== oauthConfig().issuer) return json({ error: 'forbidden' }, 403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'invalid_request' }, 400)
  let raw: string
  try { raw = await boundedBody(request, 8192) } catch { return json({ error: 'invalid_request' }, 400) }
  let data: Record<string, unknown>
  try { data = JSON.parse(raw) } catch { return json({ error: 'invalid_request' }, 400) }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'invalid_request' }, 400)
  if (!validResource(data.resource)) return json({ error: 'invalid_target' }, 400)
  const { client_id, redirect_uri, code_challenge, code_challenge_method, response_type, scope, state, consent } = data
  if (consent !== true || response_type !== 'code' || scope !== 'mythos:read' ||
      code_challenge_method !== 'S256' || !isValidPkceChallenge(code_challenge) ||
      typeof client_id !== 'string' || !client_id || client_id.length > 256 ||
      typeof redirect_uri !== 'string' || redirect_uri.length > 2048 ||
      typeof state !== 'string' || state.length < 8 || state.length > 1024) {
    return json({ error: 'invalid_request' }, 400)
  }
  const client = await prisma.oAuthClient.findUnique({
    where: { id: client_id }, select: { id: true, redirectUris: true },
  })
  if (!client || !matchesRegisteredRedirectUri(redirect_uri, client.redirectUris)) {
    // Never redirect to an unregistered URI.
    return json({ error: 'invalid_request' }, 400)
  }
  const code = issueOpaqueCredential()
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: code.hash, clientId: client.id, userId,
      redirectUri: redirect_uri, codeChallenge: code_challenge,
      resource: data.resource, scope: 'mythos:read', expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })
  const destination = new URL(redirect_uri)
  destination.searchParams.set('iss', oauthConfig().issuer)
  destination.searchParams.set('code', code.value)
  destination.searchParams.set('state', state)
  return json({ redirect_to: destination.toString() })
}

/**
 * Returns the registered client name for an OAuth consent request.
 * Does not issue credentials or grant access.
 */
export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(getClientIp(request), 'oauth:authorize', { limit: 120, windowMs: 60000, failClosed: true })
  if (limited) return limited
  const params = request.nextUrl.searchParams
  if (Array.from(params.keys()).some(key => params.getAll(key).length !== 1)) return json({ error: 'invalid_request' }, 400)
  if (!validResource(params.get('resource'))) return json({ error: 'invalid_target' }, 400)
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const challenge = params.get('code_challenge')
  const state = params.get('state')

  if (
    !clientId || clientId.length > 256 ||
    !redirectUri || redirectUri.length > 2048 ||
    params.get('response_type') !== 'code' ||
    params.get('scope') !== 'mythos:read' ||
    params.get('code_challenge_method') !== 'S256' ||
    !isValidPkceChallenge(challenge) ||
    !state || state.length < 8 || state.length > 1024
  ) {
    return json({ error: 'invalid_request' }, 400)
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, redirectUris: true },
  })

  if (!client || !matchesRegisteredRedirectUri(redirectUri, client.redirectUris)) {
    return json({ error: 'invalid_request' }, 400)
  }

  return json({
    issuer: oauthConfig().issuer,
    client_id: client.id,
    client_name: client.name,
    redirect_uri: redirectUri,
    scope: 'mythos:read',
  })
}
