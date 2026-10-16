import { spawnSync } from 'node:child_process'
const url = new URL(process.env.DATABASE_URL || 'file:///missing')
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/mythos_integration_test' || url.search !== '?schema=public') throw new Error('Refusing non-local-test database')
// Existing migration history starts after the initial schema: use db push only on this disposable DB.
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push'], { stdio: 'inherit', env: process.env })
process.exit(result.status ?? 1)
