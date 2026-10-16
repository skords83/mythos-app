import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { decideChapterProposal } from '@/lib/integration-chapter-proposal-decision'

export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

/** Explicit decision by a logged-in Mythos user, never by an OAuth bearer. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserFromRequest(request)
  if (!userId) return json({ error: 'Nicht autorisiert' }, 401)
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const expectedOrigin = host ? `${request.nextUrl.protocol}//${host}` : null

  if (origin === null || expectedOrigin === null || origin !== expectedOrigin) {
    return json({ error: 'Unzulässige Herkunft' }, 403)
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'JSON erforderlich' }, 415)
  }
  const raw = await request.text()
  if (raw.length > 1024) return json({ error: 'Anfrage zu groß' }, 413)
  let body: unknown
  try { body = JSON.parse(raw) } catch { return json({ error: 'Ungültiges JSON' }, 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Ungültige Entscheidung' }, 400)
  }
  const decision = (body as Record<string, unknown>).decision
  if (decision !== 'approve' && decision !== 'reject') {
    return json({ error: 'Ungültige Entscheidung' }, 400)
  }
  const result = await decideChapterProposal(userId, params.id, decision)
  return json(result.status === 200 ? result : { error: result.error }, result.status)
}
