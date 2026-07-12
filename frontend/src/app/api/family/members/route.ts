import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

// GET /api/family/members - Mitglieder der eigenen Familie auflisten
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const members = await prisma.user.findMany({
      where: { familyId: context.familyId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(members)
  } catch (error) {
    logger.error(error, { route: 'GET /api/family/members', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Familienmitglieder' }, { status: 500 })
  }
}

// POST /api/family/members - Neues Familienmitglied anlegen (nur OWNER)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const roleCheck = requireRole(context, ['OWNER'])
    if (roleCheck) return roleCheck

    const body = await request.json()
    const { email, password, name, role } = body

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein` },
        { status: 400 }
      )
    }
    if (role !== 'ADULT' && role !== 'CHILD') {
      return NextResponse.json({ error: 'Rolle muss ADULT oder CHILD sein' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const member = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role,
        familyId: context.familyId,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/family/members', userId })
    return NextResponse.json({ error: 'Fehler beim Anlegen des Familienmitglieds' }, { status: 500 })
  }
}
