import { NextResponse } from 'next/server'
import { oauthConfig } from '@/lib/oauth-config'
export const dynamic = 'force-dynamic'
export async function GET() {
  const { issuer } = oauthConfig()
  return NextResponse.json({
    issuer,
    authorization_endpoint: issuer + '/oauth/authorize',
    token_endpoint: issuer + '/api/oauth/token',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    scopes_supported: ['mythos:read'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    authorization_response_iss_parameter_supported: true,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
