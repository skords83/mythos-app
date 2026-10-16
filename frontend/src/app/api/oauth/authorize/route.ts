import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { issueOpaqueCredential } from '@/lib/oauth-credentials'
import { isValidPkceChallenge, matchesRegisteredRedirectUri } from '@/lib/oauth-pkce'

export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

// Authorization codes are issued only after an authenticated, explicit consent POST.
// The client and exact redirect URI must already be registered by the administrator.
export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request)
  if (!userId) return json({ error: 'login_required' }, 401)
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'invalid_request' }, 400)
  const raw = await request.text()
  if (raw.length > 8192) return json({ error: 'invalid_request' }, 400)
  let data: Record<string, unknown>
  try { data = JSON.parse(raw) } catch { return json({ error: 'invalid_request' }, 400) }
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
    return json({ error: 'invalid_client_or_redirect_uri' }, 400)
  }
  const code = issueOpaqueCredential()
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: code.hash, clientId: client.id, userId,
      redirectUri: redirect_uri, codeChallenge: code_challenge,
      scope: 'mythos:read', expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })
  const destination = new URL(redirect_uri)
  destination.searchParams.set('code', code.value)
  destination.searchParams.set('state', state)
  return json({ redirect_to: destination.toString() })
}
