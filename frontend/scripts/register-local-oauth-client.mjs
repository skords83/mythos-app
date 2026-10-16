/** Admin-only local test helper. Creates a client; never overwrites an existing registration. */
import { PrismaClient } from '@prisma/client'
const database = new URL(process.env.DATABASE_URL || 'file:///missing')
if (database.hostname !== '127.0.0.1' || database.port !== '55432' || database.pathname !== '/mythos_integration_test') throw new Error('Refusing non-local-test database')
const [id, name, ...redirectUris] = process.argv.slice(2)
if (!id || id.length > 256 || !name || !redirectUris.length) throw new Error('Usage: register-local-oauth-client.mjs CLIENT_ID NAME EXACT_REDIRECT_URI [...]')
for (const value of redirectUris) {
  const url = new URL(value)
  if (url.username || url.password || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Redirect must use HTTPS or loopback HTTP without credentials/fragments')
}
const prisma = new PrismaClient()
try {
  await prisma.oAuthClient.create({ data: { id, name, redirectUris } })
  console.log('Created local public OAuth client. Token endpoint authentication: none; PKCE S256 required.')
} finally { await prisma.$disconnect() }
