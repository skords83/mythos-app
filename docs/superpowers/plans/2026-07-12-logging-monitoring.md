# Logging & Error-Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 25 unstructured `console.error` calls in `frontend/src/app/api/**` with a structured pino logger, and add Sentry (SaaS, server+client+edge, errors only, no tracing) for error visibility in production.

**Architecture:** A small `frontend/src/lib/logger.ts` wraps `pino` (JSON logs to stdout) and forwards `logger.error()` calls to `Sentry.captureException()` with redacted context, so call sites only need one function. `@sentry/nextjs` is wired via the standard `instrumentation.ts` + `sentry.{client,server,edge}.config.ts` pattern, and stays inert (no-op) when `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are unset, mirroring the existing lazy-`JWT_SECRET` pattern in `frontend/src/lib/auth.ts`.

**Tech Stack:** Next.js 14.2.35 (App Router, Node runtime for API routes, Edge runtime for `middleware.ts`), `pino`, `@sentry/nextjs`, Jest + Testing Library (existing).

## Global Constraints

- No performance tracing / `tracesSampleRate` — errors only (spec decision).
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are optional env vars — `npm run build` and app boot must succeed without them (same pattern as `JWT_SECRET` in `frontend/src/lib/auth.ts:11-17`).
- Redact `password`, `token`, `authorization`, `jwt` keys (case-insensitive) from any object passed as log/Sentry context.
- Expected 4xx (401 bad credentials, 400 validation) are `logger.warn`, not `logger.error` — do not send them to Sentry. This plan only touches existing `console.error` call sites (which are all unexpected/5xx paths already), so no reclassification work is needed.
- Do not touch the silent `catch { return NextResponse.json({ user: null }, { status: 401 }) }` in `frontend/src/app/api/auth/route.ts:151-153` (GET `/api/auth/me`) — it's an expected auth check, not an error, and out of the spec's 25-call-site scope.
- Follow existing code style: German user-facing error strings stay as-is, only the logging call changes.

---

### Task 1: Install logging & error-tracking dependencies

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json` (generated)

**Interfaces:**
- Produces: `pino` and `@sentry/nextjs` available as importable packages for all later tasks.

- [ ] **Step 1: Install packages**

Run:
```bash
cd frontend && npm install pino @sentry/nextjs
```

- [ ] **Step 2: Verify the existing build still succeeds (packages installed but unused so far)**

Run: `cd frontend && npm run build`
Expected: build completes successfully, same as before (no code references the new packages yet).

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "Add pino and @sentry/nextjs dependencies"
```

---

### Task 2: Structured logger with secret redaction and Sentry bridge

**Files:**
- Create: `frontend/src/lib/logger.ts`
- Test: `frontend/src/lib/__tests__/logger.test.ts`

**Interfaces:**
- Consumes: `pino` (Task 1), `@sentry/nextjs` (`captureException`) (Task 1).
- Produces: `logger.info(message: string, context?: Record<string, unknown>): void`, `logger.warn(message: string, context?: Record<string, unknown>): void`, `logger.error(error: unknown, context?: Record<string, unknown>): void` — imported by all API routes in Tasks 5–10 as `import { logger } from '@/lib/logger'`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/__tests__/logger.test.ts`:

```ts
jest.mock('pino', () => {
  const mockInstance = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  return jest.fn(() => mockInstance)
})

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import pino from 'pino'
import * as Sentry from '@sentry/nextjs'
import { logger } from '../logger'

const pinoInstance = (pino as unknown as jest.Mock)()

describe('logger', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('redacts password/token/authorization/jwt keys before logging', () => {
    logger.error(new Error('boom'), {
      userId: 'u1',
      password: 'hunter2',
      token: 'abc',
      authorization: 'Bearer xyz',
      jwt: 'header.payload.sig',
    })

    const [payload] = pinoInstance.error.mock.calls[0]
    expect(payload.userId).toBe('u1')
    expect(payload.password).toBe('[REDACTED]')
    expect(payload.token).toBe('[REDACTED]')
    expect(payload.authorization).toBe('[REDACTED]')
    expect(payload.jwt).toBe('[REDACTED]')
  })

  it('logs errors as JSON via pino and forwards them to Sentry with redacted context', () => {
    const err = new Error('db down')
    logger.error(err, { route: 'GET /api/projects', password: 'secret' })

    expect(pinoInstance.error).toHaveBeenCalledTimes(1)
    const [payload, message] = pinoInstance.error.mock.calls[0]
    expect(payload.err).toBe(err)
    expect(message).toBe('db down')

    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { route: 'GET /api/projects', password: '[REDACTED]' },
    })
  })

  it('info and warn do not call Sentry', () => {
    logger.info('starting up', { port: 4000 })
    logger.warn('rate limited', { ip: '1.2.3.4' })

    expect(pinoInstance.info).toHaveBeenCalledWith({ port: 4000 }, 'starting up')
    expect(pinoInstance.warn).toHaveBeenCalledWith({ ip: '1.2.3.4' }, 'rate limited')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('handles missing context', () => {
    logger.error(new Error('no context'))
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      { extra: undefined }
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/lib/__tests__/logger.test.ts`
Expected: FAIL — `Cannot find module '../logger'`

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/logger.ts`:

```ts
import pino from 'pino'
import * as Sentry from '@sentry/nextjs'

const REDACT_KEYS = new Set(['password', 'token', 'authorization', 'jwt'])

function redact(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return context
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    result[key] = REDACT_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value
  }
  return result
}

const pinoLogger = pino({ level: process.env.LOG_LEVEL || 'info' })

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    pinoLogger.info(redact(context), message)
  },
  warn(message: string, context?: Record<string, unknown>): void {
    pinoLogger.warn(redact(context), message)
  },
  error(error: unknown, context?: Record<string, unknown>): void {
    const safeContext = redact(context)
    const message = error instanceof Error ? error.message : String(error)
    pinoLogger.error({ ...safeContext, err: error }, message)
    Sentry.captureException(error, { extra: safeContext })
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest src/lib/__tests__/logger.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/logger.ts frontend/src/lib/__tests__/logger.test.ts
git commit -m "Add structured logger with secret redaction and Sentry bridge"
```

---

### Task 3: Sentry SDK runtime configuration

**Files:**
- Create: `frontend/sentry.client.config.ts`
- Create: `frontend/sentry.server.config.ts`
- Create: `frontend/sentry.edge.config.ts`
- Create: `frontend/src/instrumentation.ts`
- Modify: `frontend/next.config.js`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `@sentry/nextjs` (Task 1).
- Produces: Sentry initialized (or safely no-op without a DSN) across client, server, and edge runtimes; `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` env vars documented and passed through Docker Compose.

- [ ] **Step 1: Check the installed `@sentry/nextjs` version's `withSentryConfig` signature before wiring `next.config.js`**

Run:
```bash
cd frontend && cat node_modules/@sentry/nextjs/package.json | grep '"version"'
grep -n "export declare function withSentryConfig" node_modules/@sentry/nextjs/build/types/config/withSentryConfig.d.ts
```
Confirm `withSentryConfig` accepts `(nextConfig, sentryBuildOptions)` — a single merged options object as the second argument (this has been the shape since `@sentry/nextjs` v8). If the installed version instead expects a third `sentryConfig` argument, adjust Step 3 below to pass `{}` as a third argument.

- [ ] **Step 2: Create the three Sentry init files**

Create `frontend/sentry.client.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
})
```

Create `frontend/sentry.server.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
})
```

Create `frontend/sentry.edge.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
})
```

(An empty/undefined `dsn` makes the Sentry SDK a safe no-op — this is documented SDK behavior, not something this project needs to guard manually.)

- [ ] **Step 3: Wire server/edge config via `instrumentation.ts`, with a boot-time warning if `SENTRY_DSN` is missing**

Create `frontend/src/instrumentation.ts`:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    if (!process.env.SENTRY_DSN) {
      const { logger } = await import('./lib/logger')
      logger.warn('SENTRY_DSN not set — error tracking disabled')
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
```

(Spec requirement: missing `SENTRY_DSN` must not be a hard failure, only a one-time warning at boot — see design spec's "Fehlerbehandlung / Edge Cases" section. This only runs in the Node runtime since `pino`/`logger.ts` needs Node APIs unavailable on Edge; the edge runtime silently no-ops on a missing DSN instead, which is acceptable since the server-side warning already surfaces the misconfiguration.)

- [ ] **Step 4: Update `frontend/next.config.js`**

Modify `frontend/next.config.js` (current content shown for reference — add the `require`, the `experimental.instrumentationHook` flag, and wrap the export):

```js
const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: true },
})
```

If Step 1 showed the installed version needs a legacy 3-argument form, use `module.exports = withSentryConfig(nextConfig, { silent: true, disableLogger: true, sourcemaps: { disable: true } }, {})` instead.

- [ ] **Step 5: Add env vars to `.env.example`**

Modify `.env.example`:
```
DB_PASSWORD=your_secure_password_here
JWT_SECRET=generate_a_long_random_secret_here
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 6: Pass env vars through in `docker-compose.yml`**

In `docker-compose.yml`, in the `app` service's `environment` block, add after `REDIS_URL: redis://redis:6379`:
```yaml
      SENTRY_DSN: ${SENTRY_DSN:-}
      NEXT_PUBLIC_SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN:-}
```

- [ ] **Step 7: Document the new env vars in `README.md`**

Add a short note in the env vars section of `README.md` next to the existing `JWT_SECRET`/`DATABASE_URL` documentation: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are optional — leave empty to disable Sentry, or fill in with a DSN from a Sentry project (sentry.io) to enable error tracking.

- [ ] **Step 8: Verify the build succeeds WITHOUT a DSN set**

Run:
```bash
cd frontend && unset SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN && npm run build
```
Expected: build completes successfully (Sentry SDK initializes with an empty DSN and stays inert).

- [ ] **Step 9: Commit**

```bash
git add frontend/sentry.client.config.ts frontend/sentry.server.config.ts frontend/sentry.edge.config.ts frontend/src/instrumentation.ts frontend/next.config.js .env.example docker-compose.yml README.md
git commit -m "Wire up Sentry SDK for server, client, and edge runtimes"
```

---

### Task 4: Client-side error boundary

**Files:**
- Create: `frontend/src/app/error.tsx`

**Interfaces:**
- Consumes: `@sentry/nextjs` (Task 1/3).

- [ ] **Step 1: Create the error boundary**

Create `frontend/src/app/error.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] dark:bg-[#1A1A1B]">
      <div className="bg-white dark:bg-[#262626] rounded-lg shadow p-8 max-w-md text-center">
        <h2 className="text-lg font-semibold mb-2">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Der Fehler wurde protokolliert. Versuche es erneut.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build still succeeds**

Run: `cd frontend && npm run build`
Expected: build completes successfully, new `error.tsx` boundary picked up by Next.js automatically.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/error.tsx
git commit -m "Add client-side error boundary reporting to Sentry"
```

---

### Task 5: Replace console.error — auth, upload, search

**Files:**
- Modify: `frontend/src/app/api/auth/route.ts:119-120`
- Modify: `frontend/src/app/api/upload/route.ts:57-58`
- Modify: `frontend/src/app/api/search/route.ts:123-124`

**Interfaces:**
- Consumes: `logger` from `@/lib/logger` (Task 2).

- [ ] **Step 1: `auth/route.ts` — add the logger import and replace the catch block**

Edit `frontend/src/app/api/auth/route.ts`, add to the import block at the top:
```ts
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
```

Replace:
```ts
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Serverfehler' },
      { status: 500 }
    )
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/auth' })
    return NextResponse.json(
      { error: 'Serverfehler' },
      { status: 500 }
    )
  }
```

- [ ] **Step 2: `upload/route.ts` — hoist `userId`, add import, replace catch block**

Edit `frontend/src/app/api/upload/route.ts`, add the import:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload fehlgeschlagen', details: String(error) }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/upload', userId })
    return NextResponse.json({ error: 'Upload fehlgeschlagen', details: String(error) }, { status: 500 })
  }
```

- [ ] **Step 3: `search/route.ts` — hoist `userId`, add import, replace catch block**

Edit `frontend/src/app/api/search/route.ts`, add the import:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { htmlToText, buildSnippet } from '@/lib/text'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: 'Fehler bei der Suche' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/search', userId })
    return NextResponse.json({ error: 'Fehler bei der Suche' }, { status: 500 })
  }
```

- [ ] **Step 4: Verify no `console.error` remains in these three files and typecheck passes**

Run:
```bash
cd frontend && grep -n "console.error" src/app/api/auth/route.ts src/app/api/upload/route.ts src/app/api/search/route.ts
```
Expected: no output (empty).

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run full test suite**

Run: `cd frontend && npm test`
Expected: all existing tests still pass (these routes have no dedicated unit tests yet — this is a regression check only).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/api/auth/route.ts frontend/src/app/api/upload/route.ts frontend/src/app/api/search/route.ts
git commit -m "Replace console.error with structured logger in auth, upload, search routes"
```

---

### Task 6: Replace console.error — chapters

**Files:**
- Modify: `frontend/src/app/api/chapters/route.ts:1-3,7,55-58,63,96-99`
- Modify: `frontend/src/app/api/chapters/[id]/route.ts:1-3,10,31-34,42,74-77,85,108-111`

**Interfaces:**
- Consumes: `logger` from `@/lib/logger` (Task 2).

- [ ] **Step 1: `chapters/route.ts` — add import, hoist `userId` in GET and POST, replace both catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching chapters:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kapitel' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/chapters', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Kapitel' }, { status: 500 })
  }
```

Replace:
```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error creating chapter:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kapitels' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/chapters', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kapitels' }, { status: 500 })
  }
```

- [ ] **Step 2: `chapters/[id]/route.ts` — add import, hoist `userId` in GET, PUT, DELETE, replace all three catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace (GET):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const chapter = await prisma.chapter.findFirst({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const chapter = await prisma.chapter.findFirst({
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Kapitels' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Kapitels' }, { status: 500 })
  }
```

Replace (PUT):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, wordCount } = body
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, wordCount } = body
```

Replace:
```ts
  } catch (error) {
    console.error('Error updating chapter:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'PUT /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```

Replace (DELETE):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    await prisma.chapter.delete({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Kapitel nicht gefunden' }, { status: 404 })
    }

    await prisma.chapter.delete({
```

Replace:
```ts
  } catch (error) {
    console.error('Error deleting chapter:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/chapters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```

- [ ] **Step 3: Verify no `console.error` remains and typecheck passes**

Run:
```bash
cd frontend && grep -n "console.error" src/app/api/chapters/route.ts "src/app/api/chapters/[id]/route.ts"
```
Expected: no output.

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `cd frontend && npm test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/chapters/route.ts" "frontend/src/app/api/chapters/[id]/route.ts"
git commit -m "Replace console.error with structured logger in chapters routes"
```

---

### Task 7: Replace console.error — notes

**Files:**
- Modify: `frontend/src/app/api/notes/route.ts`
- Modify: `frontend/src/app/api/notes/[id]/route.ts`

**Interfaces:**
- Consumes: `logger` from `@/lib/logger` (Task 2).

- [ ] **Step 1: `notes/route.ts` — add import, hoist `userId` in GET and POST, replace both catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Notizen' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/notes', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Notizen' }, { status: 500 })
  }
```

Replace:
```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Notiz' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/notes', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen der Notiz' }, { status: 500 })
  }
```

- [ ] **Step 2: `notes/[id]/route.ts` — add import, hoist `userId` in PUT and DELETE, replace both catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace (PUT):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify note belongs to user's project
    const note = await prisma.note.findFirst({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify note belongs to user's project
    const note = await prisma.note.findFirst({
```

Replace:
```ts
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'PUT /api/notes/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```

Replace (DELETE):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify note belongs to user's project
    const note = await prisma.note.findFirst({
      where: { 
        id: params.id,
        chapter: { project: { userId } }
      }
    })

    if (!note) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 })
    }

    await prisma.note.delete({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify note belongs to user's project
    const note = await prisma.note.findFirst({
      where: { 
        id: params.id,
        chapter: { project: { userId } }
      }
    })

    if (!note) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 })
    }

    await prisma.note.delete({
```

Replace:
```ts
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/notes/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```

- [ ] **Step 3: Verify no `console.error` remains and typecheck passes**

Run:
```bash
cd frontend && grep -n "console.error" src/app/api/notes/route.ts "src/app/api/notes/[id]/route.ts"
```
Expected: no output.

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `cd frontend && npm test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/notes/route.ts" "frontend/src/app/api/notes/[id]/route.ts"
git commit -m "Replace console.error with structured logger in notes routes"
```

---

### Task 8: Replace console.error — places

**Files:**
- Modify: `frontend/src/app/api/places/route.ts`
- Modify: `frontend/src/app/api/places/[id]/route.ts`

**Interfaces:**
- Consumes: `logger` from `@/lib/logger` (Task 2).

- [ ] **Step 1: `places/route.ts` — add import, hoist `userId` in GET and POST, replace both catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Orte' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Orte' }, { status: 500 })
  }
```

Replace:
```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error creating place:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ortes' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ortes' }, { status: 500 })
  }
```

- [ ] **Step 2: `places/[id]/route.ts` — add import, hoist `userId` in GET, PUT, DELETE, replace all three catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace (GET):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const place = await prisma.place.findFirst({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const place = await prisma.place.findFirst({
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching place:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Ortes' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Ortes' }, { status: 500 })
  }
```

Replace (PUT):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const place = await prisma.place.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, location, climate, importance } = body
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const place = await prisma.place.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, location, climate, importance } = body
```

Replace:
```ts
  } catch (error) {
    console.error('Error updating place:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'PUT /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```

Replace (DELETE):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const place = await prisma.place.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }

    await prisma.place.delete({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify ownership
    const place = await prisma.place.findFirst({
      where: { 
        id: params.id,
        project: { userId }
      }
    })

    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }

    await prisma.place.delete({
```

Replace:
```ts
  } catch (error) {
    console.error('Error deleting place:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```

- [ ] **Step 3: Verify no `console.error` remains and typecheck passes**

Run:
```bash
cd frontend && grep -n "console.error" src/app/api/places/route.ts "src/app/api/places/[id]/route.ts"
```
Expected: no output.

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `cd frontend && npm test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/places/route.ts" "frontend/src/app/api/places/[id]/route.ts"
git commit -m "Replace console.error with structured logger in places routes"
```

---

### Task 9: Replace console.error — characters

**Files:**
- Modify: `frontend/src/app/api/characters/route.ts`
- Modify: `frontend/src/app/api/characters/[id]/route.ts`

**Interfaces:**
- Consumes: `logger` from `@/lib/logger` (Task 2).

- [ ] **Step 1: `characters/route.ts` — add import, hoist `userId` in GET and POST, replace both catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching characters:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Charaktere' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Charaktere' }, { status: 500 })
  }
```

Replace:
```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error creating character:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Charakters' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Charakters' }, { status: 500 })
  }
```

- [ ] **Step 2: `characters/[id]/route.ts` — add import, hoist `userId` in DELETE, replace catch block**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace:
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error deleting character:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/characters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```

- [ ] **Step 3: Verify no `console.error` remains and typecheck passes**

Run:
```bash
cd frontend && grep -n "console.error" src/app/api/characters/route.ts "src/app/api/characters/[id]/route.ts"
```
Expected: no output.

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `cd frontend && npm test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/characters/route.ts" "frontend/src/app/api/characters/[id]/route.ts"
git commit -m "Replace console.error with structured logger in characters routes"
```

---

### Task 10: Replace console.error — projects

**Files:**
- Modify: `frontend/src/app/api/projects/route.ts`
- Modify: `frontend/src/app/api/projects/[id]/route.ts`

**Interfaces:**
- Consumes: `logger` from `@/lib/logger` (Task 2).

- [ ] **Step 1: `projects/route.ts` — add import, hoist `userId` in GET and POST, replace both catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace:
```ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/projects', userId })
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
```

Replace:
```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
```
with:
```ts
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
```

Replace:
```ts
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'POST /api/projects', userId })
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
```

- [ ] **Step 2: `projects/[id]/route.ts` — add import, hoist `userId` in GET, PUT, DELETE, replace all three catch blocks**

Add to the import block:
```ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
```

Replace (GET):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId },
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId },
```

Replace:
```ts
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Projekts' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'GET /api/projects/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Projekts' }, { status: 500 })
  }
```

Replace (PUT — note the existing file has inconsistent indentation around `const body`/`updateData` in this function; preserve it exactly as-is, only the `try`-open and `catch` lines change):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

const body = await request.json()
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

const body = await request.json()
```

Replace:
```ts
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'PUT /api/projects/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
```

Replace (DELETE):
```ts
) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    await prisma.project.delete({
```
with:
```ts
) {
  let userId: string | null = null
  try {
    userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    await prisma.project.delete({
```

Replace:
```ts
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```
with:
```ts
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/projects/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
```

- [ ] **Step 3: Verify no `console.error` remains and typecheck passes**

Run:
```bash
cd frontend && grep -n "console.error" src/app/api/projects/route.ts "src/app/api/projects/[id]/route.ts"
```
Expected: no output.

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `cd frontend && npm test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/projects/route.ts" "frontend/src/app/api/projects/[id]/route.ts"
git commit -m "Replace console.error with structured logger in projects routes"
```

---

### Task 11: Final verification

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm zero remaining `console.error` calls in API routes**

Run: `cd frontend && grep -rn "console.error" src/app/api`
Expected: no output.

- [ ] **Step 2: Full typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full test suite**

Run: `cd frontend && npm test`
Expected: all tests pass (20 pre-existing + 4 new logger tests = 24).

- [ ] **Step 4: Production build with a DSN set (simulated)**

Run:
```bash
cd frontend && SENTRY_DSN=https://public@o0.ingest.sentry.io/0 NEXT_PUBLIC_SENTRY_DSN=https://public@o0.ingest.sentry.io/0 npm run build
```
Expected: build completes successfully.

- [ ] **Step 5: Production build WITHOUT a DSN set**

Run:
```bash
cd frontend && unset SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN && npm run build
```
Expected: build completes successfully (Sentry stays inert, matching the JWT_SECRET lazy-read pattern).

- [ ] **Step 6: Update project memory / backlog**

No code change — after this task, update the `mythos-app-improvement-backlog` memory entry to mark "Logging/Monitoring" as done, noting: no live Sentry account was used for verification (no real DSN available in this environment) — only build-time (init with fake/no DSN) and unit-test-level (mocked `Sentry.captureException`) verification was possible. This mirrors the existing "kein Live-Smoke-Test" caveats on the Redis rate-limiting and god-component entries.

---

### Task 12: Wire `NEXT_PUBLIC_SENTRY_DSN` through the Docker build (client Sentry deploy fix)

**Context:** Task 3 set `NEXT_PUBLIC_SENTRY_DSN` in `docker-compose.yml`'s `environment:` block, but `NEXT_PUBLIC_*` vars are inlined into the client bundle at `npm run build` time, not read at container runtime. The deployed image is built once by CI (`.github/workflows/docker.yml`, `docker/build-push-action@v5`, no `build-args`) and then run via `docker-compose.yml` referencing the prebuilt `ghcr.io/skords83/mythos-app/app:latest` image (no local `build:` context) — so `docker-compose.yml`'s `environment:` entry for this var can never reach the build step that already ran in CI. Without this task, client-side Sentry silently never activates in the documented deploy path, even with a DSN configured. This was discovered during Task 3's review, confirmed by a human decision to fix it now rather than defer it.

**Files:**
- Modify: `Dockerfile`
- Modify: `.github/workflows/docker.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing from earlier tasks (independent infra change).
- Produces: `NEXT_PUBLIC_SENTRY_DSN` reaches the Next.js client bundle when the image is built in CI with the `NEXT_PUBLIC_SENTRY_DSN` GitHub Actions secret set. Falls back to empty (inert client Sentry) if the secret is unset — same fail-safe pattern as the rest of this feature.

- [ ] **Step 1: Add build-time ARG/ENV to `Dockerfile`**

Current `Dockerfile` (full content, for exact context):
```dockerfile
FROM node:20
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Generate Prisma Client as root, then fix permissions
RUN npx prisma generate
RUN chmod -R 777 /app/node_modules/.prisma 2>/dev/null || true

RUN npm run build

# Copy startup script
COPY docker-start.sh /app/docker-start.sh
RUN chmod +x /app/docker-start.sh

# Copy static files
RUN cp -r .next/static .next/standalone/.next/static
RUN mkdir -p .next/standalone/public

EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
CMD ["/app/docker-start.sh"]
```

Replace:
```dockerfile
RUN npm run build
```
with:
```dockerfile
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN npm run build
```

(`ARG` must appear before the `RUN npm run build` step to be available to it. `ENV` re-exposes the build arg as a regular env var so `next build`'s webpack `DefinePlugin`-based inlining of `process.env.NEXT_PUBLIC_*` picks it up — an `ARG` alone is not visible to `npm run build`, only `ENV` is. Declaring it near the top of the file would work too but keep it right before the build step it feeds, to keep the causal link visible to a reader.)

- [ ] **Step 2: Pass the build-arg from CI**

Current `.github/workflows/docker.yml` (full content, for exact context):
```yaml
name: Build and Push to ghcr.io

on:
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to ghcr.io
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/skords83/mythos-app/app:latest
```

Replace:
```yaml
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/skords83/mythos-app/app:latest
```
with:
```yaml
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/skords83/mythos-app/app:latest
          build-args: |
            NEXT_PUBLIC_SENTRY_DSN=${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
```

(If the `NEXT_PUBLIC_SENTRY_DSN` GitHub Actions secret is not set, this GitHub Actions expression evaluates to an empty string — `build-args` receives `NEXT_PUBLIC_SENTRY_DSN=`, which is the same safe-empty behavior as every other optional DSN in this feature. No hard failure, CI does not need the secret to build successfully.)

- [ ] **Step 3: Document the required GitHub Actions secret in `README.md`**

Find the note added in Task 3 documenting `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` as optional env vars (added next to the existing `JWT_SECRET`/`DATABASE_URL` documentation — search for `SENTRY_DSN` in `README.md` if the exact line has shifted). Immediately after that note, add:

```markdown
> **Hinweis für den Docker-Deploy-Pfad:** `NEXT_PUBLIC_SENTRY_DSN` wird beim `npm run build` in das Client-Bundle eingebettet, nicht zur Laufzeit gelesen. Im CI-Workflow (`.github/workflows/docker.yml`) muss dafür ein Repository-Secret `NEXT_PUBLIC_SENTRY_DSN` hinterlegt sein — sonst bleibt client-seitiges Sentry im gebauten Image inaktiv, auch wenn `docker-compose.yml` die Variable zur Laufzeit setzt. Server-seitiges Sentry (`SENTRY_DSN`) ist davon nicht betroffen, da es zur Laufzeit gelesen wird.
```

- [ ] **Step 4: Verify Dockerfile and workflow syntax**

Run:
```bash
docker build -f Dockerfile -t mythos-app-syntax-check --check . 2>&1 | head -20 || true
```
If `docker` is unavailable in this environment (expected in this sandbox — no Docker daemon), skip the actual build check and instead visually confirm: `ARG NEXT_PUBLIC_SENTRY_DSN` appears before `RUN npm run build` in `Dockerfile`, and `.github/workflows/docker.yml` is valid YAML:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker.yml'))" && echo "YAML OK"
```
Expected: `YAML OK` (or, if `docker build --check` ran successfully, no syntax errors reported). Note explicitly in your report that no live CI run or real Docker build was possible in this environment — this is a known verification gap, consistent with every other Docker/CI item in this project's backlog.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .github/workflows/docker.yml README.md
git commit -m "Wire NEXT_PUBLIC_SENTRY_DSN through Docker build so client Sentry works in the deployed image"
```
