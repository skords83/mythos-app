import { universeTools } from '@/lib/universe-schema'
import { runUniverseAction } from '@/lib/universe-service'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { boundedBody } from '@/lib/bounded-body'
import { runStoryAction } from '@/lib/story-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  let body
  try { body = JSON.parse(await boundedBody(request, 131072)) } catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  try {
    const result = await (universeTools.some(t => t.name === `mythos_${body?.action}`) ? runUniverseAction : runStoryAction)(auth, body?.action, body?.args)
    return NextResponse.json(result, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    logger.error(error, { route: 'POST /api/story', userId: auth.userId })
    return NextResponse.json({ error: 'Änderung konnte nicht ausgeführt werden.' }, { status: 500 })
  }
}
