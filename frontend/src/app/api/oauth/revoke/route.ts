import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Account-owner revocation, authenticated by Mythos's HttpOnly session cookie.
// The Origin check prevents cross-site form posts from revoking connections.
export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await request.json().catch(() => null)
  if (typeof data?.tokenId !== 'string' || data.tokenId.length > 128) return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
  const result = await prisma.oAuthAccessToken.updateMany({
    where: { id: data.tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return NextResponse.json({ revoked: result.count === 1 }, { headers: { 'Cache-Control': 'no-store' } })
}
