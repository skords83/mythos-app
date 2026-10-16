import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { visibilityWhere } from '@/lib/visibility'

// Internal read-only integration foundation. This is NOT yet a ChatGPT-compatible
// MCP endpoint. A production remote MCP connector still needs OAuth and transport.
export const dynamic = 'force-dynamic'

function authorized(request: NextRequest): boolean {
  const configured = process.env.MYTHOS_INTEGRATION_READ_TOKEN
  const userId = process.env.MYTHOS_INTEGRATION_USER_ID
  if (!configured || configured.length < 32 || !userId) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const supplied = header.slice(7)
  const a = createHash('sha256').update(supplied).digest()
  const b = createHash('sha256').update(configured).digest()
  return timingSafeEqual(a, b)
}

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
const ok = (value: unknown) => NextResponse.json(value, { headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: NextRequest) {
  if (!authorized(request)) return error('Nicht autorisiert', 401)
  const userId = process.env.MYTHOS_INTEGRATION_USER_ID!
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, familyId: true } })
  if (!user) return error('Nicht autorisiert', 401)

  const params = request.nextUrl.searchParams
  const action = params.get('action')
  const projectId = params.get('projectId')
  const id = params.get('id')
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 50))
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pagination = { take: limit, skip: (page - 1) * limit }
  const viewer = { userId }

  try {
    if (action === 'projects') {
      return ok(await prisma.project.findMany({
        where: { userId },
        select: { id: true, title: true, description: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' }, ...pagination,
      }))
    }
    if (!projectId) return error('projectId erforderlich', 400)
    // Project ownership is deliberately stricter than family membership.
    const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
    if (!project) return error('Projekt nicht gefunden', 404)

    if (action === 'chapters') {
      return ok(await prisma.chapter.findMany({
        where: { projectId },
        select: { id: true, title: true, order: true, wordCount: true, updatedAt: true },
        orderBy: { order: 'asc' }, ...pagination,
      }))
    }
    if (action === 'chapter') {
      if (!id) return error('id erforderlich', 400)
      const chapter = await prisma.chapter.findFirst({
        where: { id, projectId },
        select: { id: true, title: true, content: true, order: true, updatedAt: true },
      })
      return chapter ? ok(chapter) : error('Kapitel nicht gefunden', 404)
    }
    const where = { projectId, OR: visibilityWhere(viewer) }
    if (action === 'characters') return ok(await prisma.character.findMany({ where, orderBy: { createdAt: 'asc' }, ...pagination }))
    if (action === 'places') return ok(await prisma.place.findMany({ where, orderBy: { createdAt: 'asc' }, ...pagination }))
    if (action === 'timeline') return ok(await prisma.timelineEvent.findMany({ where, orderBy: { order: 'asc' }, ...pagination }))
    if (action === 'lore') return ok(await prisma.loreEntry.findMany({ where, orderBy: { createdAt: 'asc' }, ...pagination }))
    return error('Unbekannte Aktion', 400)
  } catch {
    return error('Abfrage fehlgeschlagen', 500)
  }
}

// No POST/PUT/PATCH/DELETE handlers: the integration is read-only.
