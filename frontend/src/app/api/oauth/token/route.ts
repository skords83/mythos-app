import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashCredential, issueOpaqueCredential } from '@/lib/oauth-credentials'
import { verifyPkceS256 } from '@/lib/oauth-pkce'

export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } })
const invalid = () => json({ error: 'invalid_grant' }, 400)

export async function POST(request: NextRequest) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) return json({ error: 'invalid_request' }, 400)
  const raw = await request.text()
  if (raw.length > 8192) return json({ error: 'invalid_request' }, 400)
  const params = new URLSearchParams(raw)
  const clientId = params.get('client_id')
  const code = params.get('code')
  const verifier = params.get('code_verifier')
  const redirectUri = params.get('redirect_uri')
  if (params.get('grant_type') !== 'authorization_code' || !clientId || !code || !verifier || !redirectUri ||
    clientId.length > 256 || code.length > 256 || redirectUri.length > 2048) return json({ error: 'invalid_request' }, 400)

  const codeHash = hashCredential(code)
  // Atomic single-use redemption: only one concurrent request can consume a code.
  const authorization = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash } })
  if (!authorization || authorization.clientId !== clientId || authorization.redirectUri !== redirectUri ||
    authorization.consumedAt || authorization.expiresAt <= new Date() ||
    !verifyPkceS256(authorization.codeChallenge, verifier)) return invalid()

  const claimed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { id: authorization.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  })
  if (claimed.count !== 1) return invalid()

  const credential = issueOpaqueCredential()
  await prisma.oAuthAccessToken.create({
    data: {
      tokenHash: credential.hash,
      clientId: authorization.clientId,
      userId: authorization.userId,
      scope: 'mythos:read',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })
  return json({ access_token: credential.value, token_type: 'Bearer', expires_in: 3600, scope: 'mythos:read' })
}
