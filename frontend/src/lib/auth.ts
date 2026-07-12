import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { FamilyRole } from '@prisma/client'

export interface AuthTokenPayload {
  userId: string
  email: string
  familyId: string
  role: FamilyRole | string
}

export interface AuthContext {
  userId: string
  familyId: string
  role: FamilyRole
}

// Read lazily (not at module load) so `next build` doesn't fail when
// JWT_SECRET is only provided at container runtime, not at build time.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return secret
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload
}

export async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    return verifyAuthToken(token).userId
  } catch {
    return null
  }
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const payload = verifyAuthToken(token)
    // Require both familyId and role to be present (reject legacy tokens)
    if (!payload.familyId || !payload.role) return null
    return {
      userId: payload.userId,
      familyId: payload.familyId,
      role: payload.role as FamilyRole,
    }
  } catch {
    return null
  }
}

export function requireRole(context: AuthContext | null, allowedRoles: FamilyRole[]): NextResponse | null {
  if (!context) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }
  if (!allowedRoles.includes(context.role)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }
  return null
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
