import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/daily-word-counts?projectId=xxx&days=365 - Tagesverlauf der Wortzahl für die Aktivitäts-Heatmap
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const days = Math.min(400, Math.max(1, parseInt(searchParams.get('days') || '365', 10) || 365))

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 })
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceDateString = since.toISOString().slice(0, 10)

    const entries = await prisma.dailyWordCount.findMany({
      where: { projectId, date: { gte: sinceDateString } },
      orderBy: { date: 'asc' },
      select: { date: true, wordCount: true },
    })

    return NextResponse.json(entries)
  } catch (error) {
    logger.error(error, { route: 'GET /api/daily-word-counts', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Aktivitätsdaten' }, { status: 500 })
  }
}

// POST /api/daily-word-counts - Tageswert setzen/aktualisieren (upsert auf projectId+date)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, date, wordCount } = body

    if (!projectId || !date) {
      return NextResponse.json({ error: 'Projekt-ID und Datum erforderlich' }, { status: 400 })
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const entry = await prisma.dailyWordCount.upsert({
      where: { projectId_date: { projectId, date } },
      update: { wordCount: Math.max(0, wordCount || 0) },
      create: { projectId, date, wordCount: Math.max(0, wordCount || 0) },
    })

    return NextResponse.json(entry)
  } catch (error) {
    logger.error(error, { route: 'POST /api/daily-word-counts', userId })
    return NextResponse.json({ error: 'Fehler beim Speichern der Aktivitätsdaten' }, { status: 500 })
  }
}
