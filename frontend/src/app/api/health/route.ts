import { NextResponse } from 'next/server'

// GET /api/health - liveness probe für Container-Healthchecks
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
