import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/settings - Präferenzen des eingeloggten Users (Defaults, falls noch keine existieren)
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const settings = await prisma.userSettings.findUnique({
      where: { userId: context.userId },
    })

    if (!settings) {
      return NextResponse.json({
        focusModeEnabled: false,
        spellcheckEnabled: true,
        spellcheckLocale: null,
      })
    }

    return NextResponse.json({
      focusModeEnabled: settings.focusModeEnabled,
      spellcheckEnabled: settings.spellcheckEnabled,
      spellcheckLocale: settings.spellcheckLocale,
    })
  } catch (error) {
    logger.error(error, { route: 'GET /api/settings', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Einstellungen' }, { status: 500 })
  }
}

// PUT /api/settings - Teilupdate der Präferenzen des eingeloggten Users (Upsert)
export async function PUT(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const data: {
      focusModeEnabled?: boolean
      spellcheckEnabled?: boolean
      spellcheckLocale?: string | null
    } = {}

    if ('focusModeEnabled' in body) {
      if (typeof body.focusModeEnabled !== 'boolean') {
        return NextResponse.json({ error: 'focusModeEnabled muss boolean sein' }, { status: 400 })
      }
      data.focusModeEnabled = body.focusModeEnabled
    }
    if ('spellcheckEnabled' in body) {
      if (typeof body.spellcheckEnabled !== 'boolean') {
        return NextResponse.json({ error: 'spellcheckEnabled muss boolean sein' }, { status: 400 })
      }
      data.spellcheckEnabled = body.spellcheckEnabled
    }
    if ('spellcheckLocale' in body) {
      if (body.spellcheckLocale !== null && typeof body.spellcheckLocale !== 'string') {
        return NextResponse.json({ error: 'spellcheckLocale muss ein String oder null sein' }, { status: 400 })
      }
      data.spellcheckLocale = body.spellcheckLocale
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: context.userId },
      create: { userId: context.userId, ...data },
      update: data,
    })

    return NextResponse.json({
      focusModeEnabled: settings.focusModeEnabled,
      spellcheckEnabled: settings.spellcheckEnabled,
      spellcheckLocale: settings.spellcheckLocale,
    })
  } catch (error) {
    logger.error(error, { route: 'PUT /api/settings', userId })
    return NextResponse.json({ error: 'Fehler beim Speichern der Einstellungen' }, { status: 500 })
  }
}
