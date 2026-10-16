import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashCredential } from '@/lib/oauth-credentials'
import { oauthConfig } from '@/lib/oauth-config'

export async function authenticateMcp(request: Request): Promise<NextResponse | null> {
  const { resource, metadata } = oauthConfig()
  const header = request.headers.get('authorization')
  const match = header?.match(/^Bearer ([A-Za-z0-9._~-]{1,512})$/i)
  const reject = (status: number, error?: string) => new NextResponse(null, {
    status, headers: {
      'Cache-Control': 'no-store',
      'WWW-Authenticate': `Bearer resource_metadata="${metadata}", scope="mythos:read"${error ? `, error="${error}"` : ''}`,
    },
  })
  if (!match) return reject(401, header ? 'invalid_token' : undefined)
  const token = await prisma.oAuthAccessToken.findUnique({ where: { tokenHash: hashCredential(match[1]) } })
  if (!token || token.revokedAt || token.expiresAt <= new Date() || token.resource !== resource) return reject(401, 'invalid_token')
  // MCP accepts exclusively the grant issued by this read-only authorization server.
  if (token.scope !== 'mythos:read') return reject(403, 'insufficient_scope')
  return null
}
