import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { validResource } from '@/lib/oauth-config'
import { boundedBody } from '@/lib/bounded-body'
import { prisma } from '@/lib/prisma'
import { hashCredential, issueOpaqueCredential } from '@/lib/oauth-credentials'
import { verifyPkceS256 } from '@/lib/oauth-pkce'

export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } })
const invalid = () => json({ error: 'invalid_grant' }, 400)

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(getClientIp(request), 'oauth:token', { limit: 60, windowMs: 60000, failClosed: true })
  if (limited) return limited
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) return json({ error: 'invalid_request' }, 400)
  let raw: string
  try { raw = await boundedBody(request, 8192) } catch { return json({ error: 'invalid_request' }, 400) }
  const params = new URLSearchParams(raw)
  if (Array.from(params.keys()).some(key => params.getAll(key).length !== 1)) return json({ error: 'invalid_request' }, 400)
  if (request.headers.has('authorization') || params.has('client_secret')) return json({ error: 'invalid_client' }, 401)
  if (!validResource(params.get('resource'))) return json({ error: 'invalid_target' }, 400)
  if (params.get('grant_type') !== 'authorization_code') return json({ error: 'unsupported_grant_type' }, 400)
  const clientId = params.get('client_id')
  const code = params.get('code')
  const verifier = params.get('code_verifier')
  const redirectUri = params.get('redirect_uri')
  if (params.get('grant_type') !== 'authorization_code' || !clientId || !code || !verifier || !redirectUri ||
    clientId.length > 256 || code.length > 256 || redirectUri.length > 2048) return json({ error: 'invalid_request' }, 400)

  const codeHash = hashCredential(code)
  // Atomic single-use redemption: only one concurrent request can consume a code.
  const authorization = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash } })
  if (!authorization || authorization.resource !== params.get('resource') || authorization.scope !== 'mythos:read' || authorization.clientId !== clientId || authorization.redirectUri !== redirectUri ||
    authorization.consumedAt || authorization.expiresAt <= new Date() ||
    !verifyPkceS256(authorization.codeChallenge, verifier)) return invalid()

  const credential = issueOpaqueCredential()
  const issued = await prisma.$transaction(async tx => {
    const claimed = await tx.oAuthAuthorizationCode.updateMany({
      where: { id: authorization.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    })
    if (claimed.count !== 1) return false

    await tx.oAuthAccessToken.create({
      data: {
        tokenHash: credential.hash,
        clientId: authorization.clientId,
        userId: authorization.userId,
        resource: authorization.resource,
        scope: 'mythos:read',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
    return true
  })
  if (!issued) return invalid()
  return json({ access_token: credential.value, token_type: 'Bearer', expires_in: 3600, scope: 'mythos:read' })
}
