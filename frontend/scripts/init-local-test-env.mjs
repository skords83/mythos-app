/** Creates only a new local configuration. Never reads production settings or overwrites files. */
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
const password = randomBytes(32).toString('hex')
const config = {
  MYTHOS_TEST_DB_PASSWORD: password,
  DATABASE_URL: `postgresql://mythos_test:${password}@127.0.0.1:55432/mythos_integration_test?schema=public`,
  REDIS_URL: 'redis://127.0.0.1:56379',
  JWT_SECRET: randomBytes(48).toString('hex'),
  MYTHOS_OAUTH_ISSUER: 'http://localhost:4000',
  MYTHOS_INTEGRATION_READ_TOKEN: '',
  MYTHOS_INTEGRATION_USER_ID: '',
  SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_DSN: '',
}
writeFileSync(new URL('../.env.local', import.meta.url), '# Isolated local test environment. Never commit.\n' + Object.entries(config).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 })
console.log('Created frontend/.env.local with fresh local credentials. Existing files are never overwritten.')
