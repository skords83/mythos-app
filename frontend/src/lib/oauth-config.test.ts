/** @jest-environment node */
import { oauthConfig, validResource } from './oauth-config'
const previous = process.env.MYTHOS_OAUTH_ISSUER
afterEach(() => {
  if (previous === undefined) delete process.env.MYTHOS_OAUTH_ISSUER
  else process.env.MYTHOS_OAUTH_ISSUER = previous
})
test.each(['https://staging.example', 'http://localhost:4000', 'http://127.0.0.1:4000'])('accepts canonical issuer %s', issuer => {
  process.env.MYTHOS_OAUTH_ISSUER = issuer
  expect(oauthConfig().issuer).toBe(issuer)
  expect(validResource(issuer + '/api/integrations/mcp')).toBe(true)
  expect(validResource(issuer + '/api/integrations/mcp/')).toBe(false)
})
test.each(['http://public.example', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?x=1', 'https://example.com#fragment', 'file:///tmp'])('rejects invalid issuer %s', issuer => {
  process.env.MYTHOS_OAUTH_ISSUER = issuer
  expect(oauthConfig).toThrow()
})
