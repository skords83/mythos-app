/** Canonical deployment identity; never derived from untrusted Host/Forwarded headers. */
export function oauthConfig() {
  const configured = process.env.MYTHOS_OAUTH_ISSUER
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('MYTHOS_OAUTH_ISSUER required')
  const url = new URL(configured || 'http://localhost:4000')
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('MYTHOS_OAUTH_ISSUER must be an HTTPS origin (HTTP loopback allowed for tests)')
  }
  const issuer = url.origin
  return { issuer, resource: issuer + '/api/integrations/mcp', metadata: issuer + '/.well-known/oauth-protected-resource/api/integrations/mcp' }
}

export function validResource(resource: unknown): resource is string {
  return resource === oauthConfig().resource
}
