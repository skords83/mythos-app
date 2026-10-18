import { bookEntityScope } from '@/lib/universe-scope'
import type { RelatableEntityType } from '@prisma/client'
import { readMcpRelations } from '@/lib/mcp-relations'
import { NextRequest, NextResponse } from 'next/server'
import { resolveReadOnlyUser } from '@/lib/integration-auth'
import { prisma } from '@/lib/prisma'
import { visibilityWhere } from '@/lib/visibility'

// Internal read-only integration foundation. This is NOT yet a ChatGPT-compatible
// MCP endpoint. A production remote MCP connector still needs OAuth and transport.
export const dynamic = 'force-dynamic'

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
const ok = (value: unknown) => NextResponse.json(value, { headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: NextRequest) {
  const userId = await resolveReadOnlyUser(request.headers.get('authorization'))
  if (!userId) return error('Nicht autorisiert', 401)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, familyId: true } })
  if (!user) return error('Nicht autorisiert', 401)

  const params = request.nextUrl.searchParams
  const action = params.get('action')
  const projectId = params.get('projectId')
  const id = params.get('id')
  const parseBoundedInt = (raw: string | null, fallback: number, max: number): number | null => {
    if (raw === null) return fallback
    if (!/^[1-9]\d{0,5}$/.test(raw)) return null
    const value = Number(raw)
    return value <= max ? value : null
  }
  const limit = parseBoundedInt(params.get('limit'), 50, 100)
  const page = parseBoundedInt(params.get('page'), 1, 10000)
  if (limit === null || page === null) return error('Ungültige Seitennummer oder Seitengröße', 400)
  const pagination = { take: limit, skip: (page - 1) * limit }
  const viewer = { userId }
  if (projectId && projectId.length > 128) return error('Ungültige Projekt-ID', 400)
  if (id && id.length > 128) return error('Ungültige ID', 400)

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
    const kind = ({ items: 'ITEM', factions: 'FACTION', characters: 'CHARACTER', places: 'PLACE', lore: 'LORE_ENTRY' } as Record<string, RelatableEntityType>)[action ?? '']
    const scope = kind ? await bookEntityScope(prisma, projectId, kind) : { projectId }
    const where = 'OR' in scope ? { AND: [scope, { OR: visibilityWhere(viewer) }] } : { projectId, OR: visibilityWhere(viewer) }
    if (action === 'items' || action === 'factions') {
      const entries = action === 'items'
        ? await prisma.item.findMany({ where, orderBy: { createdAt: 'asc' }, ...pagination })
        : await prisma.faction.findMany({ where, orderBy: { createdAt: 'asc' }, ...pagination })
      return ok(await Promise.all(entries.map(async entry => ({ ...entry, relations: await readMcpRelations(prisma, action === 'items' ? 'ITEM' : 'FACTION', entry, userId) }))))
    }
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
