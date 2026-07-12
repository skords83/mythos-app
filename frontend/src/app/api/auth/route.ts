import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signAuthToken, verifyAuthToken, setAuthCookie, clearAuthCookie } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, name } = body
    const ip = getClientIp(request)

    if (action === 'register') {
      const limited = await checkRateLimit(ip, 'auth:register', { limit: 5, windowMs: 60 * 60 * 1000 })
      if (limited) return limited

      if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
        return NextResponse.json(
          { error: 'Ungültige E-Mail-Adresse' },
          { status: 400 }
        )
      }

      if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein` },
          { status: 400 }
        )
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'E-Mail bereits vergeben' },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      const displayName = name || email.split('@')[0]

      // Create user as OWNER of a brand-new Family
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: displayName,
          role: 'OWNER',
          family: { create: { name: `${displayName}s Familie` } },
        },
      })

      // Generate token
      const token = signAuthToken({ userId: user.id, email: user.email, familyId: user.familyId, role: user.role })

      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Registrierung erfolgreich',
      })

      setAuthCookie(response, token)
      return response
    }

    if (action === 'login') {
      const limited = await checkRateLimit(ip, 'auth:login', { limit: 10, windowMs: 15 * 60 * 1000 })
      if (limited) return limited

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Ungültige Anmeldedaten' },
          { status: 401 }
        )
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password)

      if (!isValid) {
        return NextResponse.json(
          { error: 'Ungültige Anmeldedaten' },
          { status: 401 }
        )
      }

      // Generate token
      const token = signAuthToken({ userId: user.id, email: user.email, familyId: user.familyId, role: user.role })

      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Anmeldung erfolgreich',
      })

      setAuthCookie(response, token)
      return response
    }

    if (action === 'logout') {
      const response = NextResponse.json({ message: 'Abmeldung erfolgreich' })
      clearAuthCookie(response)
      return response
    }

    return NextResponse.json(
      { error: 'Ungültige Aktion' },
      { status: 400 }
    )
  } catch (error) {
    logger.error(error, { route: 'POST /api/auth' })
    return NextResponse.json(
      { error: 'Serverfehler' },
      { status: 500 }
    )
  }
}

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const decoded = verifyAuthToken(token)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 401 })
      clearAuthCookie(response)
      return response
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
