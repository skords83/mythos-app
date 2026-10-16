import { NextResponse } from 'next/server'
import { oauthConfig } from '@/lib/oauth-config'
export const dynamic = 'force-dynamic'
export async function GET() {
  const { issuer, resource } = oauthConfig()
  return NextResponse.json({ resource, authorization_servers: [issuer], scopes_supported: ['mythos:read'], bearer_methods_supported: ['header'], resource_name: 'Mythos read-only' }, { headers: { 'Cache-Control': 'no-store' } })
}
