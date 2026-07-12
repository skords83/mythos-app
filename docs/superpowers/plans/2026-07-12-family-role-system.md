# Family Role System (Roadmap Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn mythos-app from a single-user tool into a Family-scoped multi-user tool: a `Family` tenant boundary, a three-tier `FamilyRole` (OWNER/ADULT/CHILD), server-side role guards on every route, and a shared family-wide Character/Place library with PRIVATE/FAMILY visibility.

**Architecture:** `Family` is the new tenant root; `User.familyId` + `User.role` place every user inside exactly one family. `Character` and `Place` gain their own `familyId`/`authorId`/`visibility` and an **optional** `projectId` — they can hang off a specific `Project` (as today) or float free as family-wide library entries (the "geteilte Charakter-/Welten-Datenbank"). `Project`/`Chapter` stay single-owner and untouched — Phase 1 only shares Characters/Places, not whole manuscripts. Role/family are embedded in the signed JWT at login/register (no extra DB round-trip per request) and read via a new `getAuthContext()` guard.

**Tech Stack:** Next.js 14 App Router route handlers, Prisma 5 + PostgreSQL, `jsonwebtoken`, `bcryptjs`, Jest + `next/jest` (jsdom by default, `@jest-environment node` override for route/auth tests), React 18 client components, Tailwind CSS.

## Global Constraints

- Every new/modified API route must call `getAuthContext(request)` and return 401 if null — never rely on UI hiding alone (user directive #3).
- `enum FamilyRole { OWNER, ADULT, CHILD }` — exactly these three values, no binary admin/user shortcut.
- All new Tailwind UI must follow Neo-Brutalism rules: `rounded-none` (only `rounded-sm` for tiny badges), no `shadow-md/lg`/`backdrop-blur`, offset shadows (`shadow-[4px_4px_0_0_#18181b]` light / `dark:shadow-[4px_4px_0_0_#3f3f46]` dark) **only** on the top-level card — nested elements get a plain `border` instead. Light: `bg-stone-50`/`bg-stone-100` + `text-zinc-900`. Dark: `dark:bg-zinc-950`/`dark:bg-zinc-900` + `dark:text-zinc-200`. Borders: `border-zinc-900` light / `dark:border-zinc-700`. Accent: `bg-indigo-600 hover:bg-indigo-700` (not the app's current green `#4A7C59` — this is a deliberate new-component exception, Phase 2 migrates the rest).
- No live Postgres/Docker is available in this sandbox (confirmed in prior sessions). Every task must be verifiable via `tsc --noEmit`, `npx prisma validate`/`generate` (schema-only, no DB), and Jest with a mocked `@/lib/prisma` — never assume a reachable `DATABASE_URL`. Applying the actual migration SQL to a real database is called out explicitly as a manual step for the user.
- Follow existing route conventions exactly: `let userId: string | null = null` hoisted before `try`, `logger.error(error, { route: 'METHOD /path', userId })` in `catch`, German user-facing error strings, `NextResponse.json({ error: '...' }, { status })`.

---

## File Structure

- `frontend/prisma/schema.prisma` — modify: add `Family`, `FamilyRole`, `Visibility`; extend `User`, `Character`, `Place`.
- `frontend/prisma/migrations/migration_lock.toml` — create: Prisma migration provider lock.
- `frontend/prisma/migrations/20260712120000_add_family_role_system/migration.sql` — create: hand-authored backfill migration.
- `frontend/src/lib/auth.ts` — modify: `AuthTokenPayload` gains `familyId`/`role`; add `AuthContext`, `getAuthContext()`, `requireRole()`.
- `frontend/src/lib/__tests__/auth.test.ts` — modify: update existing payloads, add guard tests.
- `frontend/src/app/api/auth/route.ts` — modify: register creates a `Family` + `OWNER`; login signs `familyId`/`role`.
- `frontend/src/app/api/family/members/route.ts` — create: `GET`/`POST` family member management.
- `frontend/src/app/api/family/members/__tests__/route.test.ts` — create.
- `frontend/src/app/api/characters/route.ts` — modify: family/visibility scoping, family-wide library mode.
- `frontend/src/app/api/characters/[id]/route.ts` — modify: add `PUT`, rewrite `DELETE` guard.
- `frontend/src/app/api/characters/__tests__/route.test.ts` — create.
- `frontend/src/app/api/places/route.ts` — modify: mirror characters.
- `frontend/src/app/api/places/[id]/route.ts` — modify: mirror characters.
- `frontend/src/app/api/places/__tests__/route.test.ts` — create.
- `frontend/src/app/components/types.ts` — modify: `Character`/`Place` gain `visibility`/`familyId`/`authorId`, `projectId` becomes nullable.
- `frontend/src/app/components/AddCharacterModal.tsx`, `EditCharacterModal.tsx`, `AddPlaceModal.tsx` — modify: visibility selector.
- `frontend/src/app/hooks/useCharacters.ts`, `usePlaces.ts` — modify: thread `visibility` through.
- `frontend/src/app/family/page.tsx` — create: family member list + add-member form (OWNER-gated in UI, enforced server-side regardless).
- `frontend/src/app/dashboard/page.tsx` — modify: nav link to `/family`.

---

### Task 1: Prisma schema — Family, FamilyRole, Visibility

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Create: `frontend/prisma/migrations/migration_lock.toml`
- Create: `frontend/prisma/migrations/20260712120000_add_family_role_system/migration.sql`

**Interfaces:**
- Produces: Prisma models `Family { id, name, createdAt, updatedAt }`; enum `FamilyRole { OWNER, ADULT, CHILD }`; enum `Visibility { PRIVATE, FAMILY }`; `User.familyId: string`, `User.role: FamilyRole`; `Character`/`Place` gain `visibility: Visibility`, `familyId: string`, `authorId: string`, and `projectId` becomes `String?` (nullable).

- [ ] **Step 1: Replace `frontend/prisma/schema.prisma` with the full updated schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum FamilyRole {
  OWNER
  ADULT
  CHILD
}

enum Visibility {
  PRIVATE
  FAMILY
}

model Family {
  id         String      @id @default(cuid())
  name       String
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  members    User[]
  characters Character[]
  places     Place[]
}

model User {
  id         String      @id @default(cuid())
  email      String      @unique
  name       String?
  password   String    // hashed password
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  projects   Project[]
  familyId   String
  family     Family      @relation(fields: [familyId], references: [id], onDelete: Cascade)
  role       FamilyRole  @default(ADULT)
  characters Character[]
  places     Place[]
}

model Project {
  id String @id @default(cuid())
  title String
  description String?
  coverImage String?
  wordGoal Int @default(500)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapters Chapter[]
  characters Character[]
  places Place[]
}

model Chapter {
  id        String   @id @default(cuid())
  title     String
  content   Json?
  order     Int      @default(0)
  wordCount Int      @default(0)
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  notes     Note[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Character {
  id          String     @id @default(cuid())
  name        String
  description String?
  motivation  String?
  visibility  Visibility @default(PRIVATE)
  projectId   String?
  project     Project?   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  familyId    String
  family      Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)
  authorId    String
  author      User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Note {
  id        String   @id @default(cuid())
  title     String   @default("Neue Notiz")
  content   String
  chapterId String
  chapter   Chapter  @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Place {
  id          String     @id @default(cuid())
  name        String
  description String?
  location    String?
  climate     String?
  importance  String?
  visibility  Visibility @default(PRIVATE)
  projectId   String?
  project     Project?   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  familyId    String
  family      Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)
  authorId    String
  author      User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

- [ ] **Step 2: Create the migration lock file**

`frontend/prisma/migrations/migration_lock.toml`:

```toml
# Please do not edit this file manually
# It should be added in your version-control system (i.e. Git)
provider = "postgresql"
```

- [ ] **Step 3: Hand-author the backfill migration**

This project has never run `prisma migrate` before (no `migrations/` folder existed) — schema was applied ad hoc. Adding `familyId`/`role`/`authorId` as required columns on tables that already hold data requires a *backfill*, which `prisma db push` cannot express. Write the migration SQL by hand instead of generating it, since generating it would require a live shadow database this sandbox doesn't have.

`frontend/prisma/migrations/20260712120000_add_family_role_system/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('OWNER', 'ADULT', 'CHILD');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'FAMILY');

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable columns first, existing rows get backfilled below
ALTER TABLE "User" ADD COLUMN "familyId" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "FamilyRole" NOT NULL DEFAULT 'ADULT';

ALTER TABLE "Character" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Character" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Character" ADD COLUMN "authorId" TEXT;
ALTER TABLE "Character" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "Place" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Place" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Place" ADD COLUMN "authorId" TEXT;
ALTER TABLE "Place" ALTER COLUMN "projectId" DROP NOT NULL;

-- Data backfill: one new Family per existing User, that user becomes its OWNER
DO $$
DECLARE
  u RECORD;
  new_family_id TEXT;
BEGIN
  FOR u IN SELECT id, COALESCE(name, email) AS label FROM "User" WHERE "familyId" IS NULL LOOP
    new_family_id := 'fam_' || substr(md5(random()::text || u.id), 1, 20);
    INSERT INTO "Family" (id, name, "createdAt", "updatedAt")
    VALUES (new_family_id, u.label || 's Familie', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    UPDATE "User" SET "familyId" = new_family_id, "role" = 'OWNER' WHERE id = u.id;
  END LOOP;
END $$;

-- Backfill Character/Place familyId + authorId from their project's owner
UPDATE "Character" c
SET "familyId" = u."familyId", "authorId" = p."userId"
FROM "Project" p
JOIN "User" u ON u.id = p."userId"
WHERE c."projectId" = p.id AND c."familyId" IS NULL;

UPDATE "Place" pl
SET "familyId" = u."familyId", "authorId" = p."userId"
FROM "Project" p
JOIN "User" u ON u.id = p."userId"
WHERE pl."projectId" = p.id AND pl."familyId" IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "User" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Character" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Character" ALTER COLUMN "authorId" SET NOT NULL;
ALTER TABLE "Place" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Place" ALTER COLUMN "authorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Validate the schema without a database connection**

Run: `cd frontend && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Regenerate the Prisma client (schema-only, no DB needed)**

Run: `cd frontend && npx prisma generate`
Expected: `Generated Prisma Client ... in ...ms` — no errors. This is what makes `Family`, `FamilyRole`, `Visibility`, and the new fields available to TypeScript for every later task.

- [ ] **Step 6: Note the manual deploy step (cannot run in this sandbox)**

No Postgres is reachable here. Once this ships, the migration must be applied against the real database with:
`docker compose exec app npx prisma migrate deploy` (or locally with `DATABASE_URL` pointed at a real Postgres). Until that runs, existing users have no `familyId` in the real DB and every route touched in Tasks 3–6 will fail at runtime against production data — this is expected and matches how this repo has always handled DB-dependent verification (see `mythos-app-improvement-backlog` memory: prior features also shipped without a live DB smoke test).

- [ ] **Step 7: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations
git commit -m "feat: add Family/FamilyRole/Visibility data model"
```

---

### Task 2: Auth guard helpers — getAuthContext, requireRole

**Files:**
- Modify: `frontend/src/lib/auth.ts`
- Modify: `frontend/src/lib/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `FamilyRole` enum from `@prisma/client` (Task 1).
- Produces: `AuthTokenPayload { userId, email, familyId, role }`; `AuthContext { userId, familyId, role }`; `getAuthContext(request: NextRequest): Promise<AuthContext | null>`; `requireRole(context: AuthContext, allowed: FamilyRole[]): NextResponse | null` — consumed by every route in Tasks 3–6.

- [ ] **Step 1: Write the failing tests first — replace `frontend/src/lib/__tests__/auth.test.ts` in full**

```typescript
/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  signAuthToken,
  verifyAuthToken,
  getUserFromRequest,
  getAuthContext,
  requireRole,
  setAuthCookie,
  clearAuthCookie,
} from '../auth'

describe('auth token helpers', () => {
  const originalSecret = process.env.JWT_SECRET

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret
  })

  it('signs and verifies a round-trip token', () => {
    const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    const payload = verifyAuthToken(token)
    expect(payload.userId).toBe('user-1')
    expect(payload.email).toBe('a@example.com')
    expect(payload.familyId).toBe('fam-1')
    expect(payload.role).toBe('ADULT')
  })

  it('throws when verifying a tampered token', () => {
    const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    expect(() => verifyAuthToken(token + 'tampered')).toThrow()
  })

  it('throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET
    expect(() =>
      signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    ).toThrow('JWT_SECRET environment variable is not set')
    process.env.JWT_SECRET = 'test-secret'
  })
})

describe('getUserFromRequest', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  it('returns null when there is no auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/test')
    expect(await getUserFromRequest(request)).toBeNull()
  })

  it('returns null when the cookie holds an invalid token', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: 'auth-token=not-a-real-token' },
    })
    expect(await getUserFromRequest(request)).toBeNull()
  })

  it('returns the userId when the cookie holds a valid token', async () => {
    const token = signAuthToken({ userId: 'user-42', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${token}` },
    })
    expect(await getUserFromRequest(request)).toBe('user-42')
  })
})

describe('getAuthContext', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  it('returns null when there is no auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/test')
    expect(await getAuthContext(request)).toBeNull()
  })

  it('returns null when the cookie holds an invalid token', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: 'auth-token=not-a-real-token' },
    })
    expect(await getAuthContext(request)).toBeNull()
  })

  it('returns userId/familyId/role when the token is valid and complete', async () => {
    const token = signAuthToken({ userId: 'user-42', email: 'a@example.com', familyId: 'fam-7', role: 'CHILD' })
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${token}` },
    })
    expect(await getAuthContext(request)).toEqual({ userId: 'user-42', familyId: 'fam-7', role: 'CHILD' })
  })

  it('returns null for a legacy token that is missing familyId/role', async () => {
    const legacyToken = require('jsonwebtoken').sign({ userId: 'user-1', email: 'a@example.com' }, 'test-secret')
    const request = new NextRequest('http://localhost/api/test', {
      headers: { cookie: `auth-token=${legacyToken}` },
    })
    expect(await getAuthContext(request)).toBeNull()
  })
})

describe('requireRole', () => {
  it('returns null (no response) when the role is allowed', () => {
    const context = { userId: 'user-1', familyId: 'fam-1', role: 'OWNER' as const }
    expect(requireRole(context, ['OWNER', 'ADULT'])).toBeNull()
  })

  it('returns a 403 NextResponse when the role is not allowed', async () => {
    const context = { userId: 'user-1', familyId: 'fam-1', role: 'CHILD' as const }
    const result = requireRole(context, ['OWNER'])
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
    const body = await result?.json()
    expect(body.error).toBe('Keine Berechtigung')
  })
})

describe('auth cookie helpers', () => {
  it('sets an httpOnly auth-token cookie', () => {
    const response = NextResponse.json({ ok: true })
    setAuthCookie(response, 'a-token')
    const cookie = response.cookies.get('auth-token')
    expect(cookie?.value).toBe('a-token')
    expect(cookie?.httpOnly).toBe(true)
  })

  it('clears the auth-token cookie', () => {
    const response = NextResponse.json({ ok: true })
    clearAuthCookie(response)
    const cookie = response.cookies.get('auth-token')
    expect(cookie?.value).toBe('')
    expect(cookie?.maxAge).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail on the missing exports**

Run: `cd frontend && npx jest src/lib/__tests__/auth.test.ts`
Expected: FAIL — `getAuthContext`, `requireRole` are not exported from `../auth`, and `signAuthToken` calls are missing required `familyId`/`role` (TS error surfaces as a Jest/ts-jest failure).

- [ ] **Step 3: Implement — replace `frontend/src/lib/auth.ts` in full**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { FamilyRole } from '@prisma/client'

export interface AuthTokenPayload {
  userId: string
  email: string
  familyId: string
  role: FamilyRole
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

// Reads userId/familyId/role straight out of the signed JWT — no DB round-trip.
// A token signed before this field existed (or a role change since the last
// login) has no familyId/role, so it's treated as unauthenticated rather than
// trusting a stale/absent role — the caller must log in again to refresh it.
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const payload = verifyAuthToken(token)
    if (!payload.familyId || !payload.role) return null
    return { userId: payload.userId, familyId: payload.familyId, role: payload.role }
  } catch {
    return null
  }
}

export function requireRole(context: AuthContext, allowed: FamilyRole[]): NextResponse | null {
  if (!allowed.includes(context.role)) {
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
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `cd frontend && npx jest src/lib/__tests__/auth.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Type-check the whole project**

Run: `cd frontend && npx tsc --noEmit`
Expected: fails only on the *other* files that still call `signAuthToken` with the old 2-field payload (`api/auth/route.ts`) — that's Task 3. No errors inside `lib/auth.ts` or `lib/__tests__/auth.test.ts` itself.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/auth.ts frontend/src/lib/__tests__/auth.test.ts
git commit -m "feat: add getAuthContext/requireRole guards, embed familyId/role in JWT"
```

---

### Task 3: Registration creates a Family; login signs familyId/role

**Files:**
- Modify: `frontend/src/app/api/auth/route.ts`

**Interfaces:**
- Consumes: `signAuthToken` with the new required `familyId`/`role` fields (Task 2); `prisma.user.create({ data: { ..., role: 'OWNER', family: { create: { name } } } })` (Task 1 schema).
- Produces: every newly registered user is `OWNER` of a brand-new `Family`; every signed token (register + login) carries `familyId`/`role`.

- [ ] **Step 1: Edit `frontend/src/app/api/auth/route.ts` — register action creates the Family**

Replace:
```typescript
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
        },
      })

      // Generate token
      const token = signAuthToken({ userId: user.id, email: user.email })
```

With:
```typescript
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      const displayName = name || email.split('@')[0]

      // Create user as OWNER of a brand-new Family
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: displayName,
          role: 'OWNER',
          family: { create: { name: `${displayName}s Familie` } },
        },
      })

      // Generate token
      const token = signAuthToken({ userId: user.id, email: user.email, familyId: user.familyId, role: user.role })
```

- [ ] **Step 2: Edit the login action to sign the new fields**

Replace:
```typescript
      // Generate token
      const token = signAuthToken({ userId: user.id, email: user.email })

      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Anmeldung erfolgreich',
      })
```

With:
```typescript
      // Generate token
      const token = signAuthToken({ userId: user.id, email: user.email, familyId: user.familyId, role: user.role })

      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Anmeldung erfolgreich',
      })
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS, no errors (this was the file failing after Task 2's signature change).

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `cd frontend && npx jest`
Expected: PASS. There is no existing test file for `api/auth/route.ts`, so this only re-confirms `auth.test.ts` and the other existing suites are unaffected.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/auth/route.ts
git commit -m "feat: registration creates a Family (user becomes OWNER), login signs familyId/role"
```

---

### Task 4: Family member management API

**Files:**
- Create: `frontend/src/app/api/family/members/route.ts`
- Create: `frontend/src/app/api/family/members/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getAuthContext`, `requireRole` (Task 2).
- Produces: `GET /api/family/members` (any authenticated family member) → `{id, email, name, role, createdAt}[]`; `POST /api/family/members` (OWNER only) → creates an ADULT or CHILD member in the caller's family, `201` with the created member (no password field).

- [ ] **Step 1: Write the failing test — create `frontend/src/app/api/family/members/__tests__/route.test.ts`**

```typescript
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

const mockedPrisma = prisma as unknown as {
  user: {
    findMany: jest.Mock
    findUnique: jest.Mock
    create: jest.Mock
  }
}

function requestWithRole(role: 'OWNER' | 'ADULT' | 'CHILD', url = 'http://localhost/api/family/members', init: RequestInit = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role })
  return new NextRequest(url, {
    ...init,
    headers: { ...(init.headers || {}), cookie: `auth-token=${token}` },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/family/members', () => {
  it('returns 401 without an auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/family/members')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('lists members of the caller\'s family for any role', async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'a@example.com', name: 'Anna', role: 'OWNER', createdAt: new Date() },
    ])
    const response = await GET(requestWithRole('CHILD'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'fam-1' } })
    )
  })
})

describe('POST /api/family/members', () => {
  it('returns 401 without an auth cookie', async () => {
    const request = new NextRequest('http://localhost/api/family/members', { method: 'POST', body: '{}' })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 403 when the caller is not OWNER', async () => {
    const request = requestWithRole('ADULT', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'kid@example.com', password: 'password123', role: 'CHILD' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('creates a family member when the caller is OWNER', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-2', email: 'kid@example.com', name: 'kid', role: 'CHILD', createdAt: new Date(),
    })
    const request = requestWithRole('OWNER', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'kid@example.com', password: 'password123', role: 'CHILD' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ familyId: 'fam-1', role: 'CHILD' }) })
    )
  })

  it('rejects an invalid role', async () => {
    const request = requestWithRole('OWNER', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'kid@example.com', password: 'password123', role: 'OWNER' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd frontend && npx jest src/app/api/family/members`
Expected: FAIL — `../route` module doesn't exist yet.

- [ ] **Step 3: Implement — create `frontend/src/app/api/family/members/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

// GET /api/family/members - Mitglieder der eigenen Familie auflisten
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const members = await prisma.user.findMany({
      where: { familyId: context.familyId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(members)
  } catch (error) {
    logger.error(error, { route: 'GET /api/family/members', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Familienmitglieder' }, { status: 500 })
  }
}

// POST /api/family/members - Neues Familienmitglied anlegen (nur OWNER)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const roleCheck = requireRole(context, ['OWNER'])
    if (roleCheck) return roleCheck

    const body = await request.json()
    const { email, password, name, role } = body

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein` },
        { status: 400 }
      )
    }
    if (role !== 'ADULT' && role !== 'CHILD') {
      return NextResponse.json({ error: 'Rolle muss ADULT oder CHILD sein' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const member = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role,
        familyId: context.familyId,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/family/members', userId })
    return NextResponse.json({ error: 'Fehler beim Anlegen des Familienmitglieds' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `cd frontend && npx jest src/app/api/family/members`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/family/members
git commit -m "feat: add family member management API (OWNER-only invite, family-wide list)"
```

---

### Task 5: Character route — family scoping, visibility, shared library

**Files:**
- Modify: `frontend/src/app/api/characters/route.ts`
- Modify: `frontend/src/app/api/characters/[id]/route.ts`
- Modify: `frontend/src/app/components/types.ts` (Character interface only)
- Create: `frontend/src/app/api/characters/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getAuthContext` (Task 2).
- Produces: `GET /api/characters?projectId=` → characters of that project visible to the caller (own + FAMILY-visible); `GET /api/characters` (no projectId) → the family-wide shared library (own + FAMILY-visible, not tied to any project); `POST /api/characters` accepts optional `projectId` and `visibility`; `PUT`/`DELETE /api/characters/[id]` restricted to the author (`DELETE` also allowed for `OWNER`, for family moderation).

**Design note:** creating a character now checks the target project belongs to *any* user in the caller's family (`project.user.familyId`), not just the caller — that's what makes "geteilte Charakter-Datenbank" possible. Viewing/editing the Project itself is untouched and still owner-only.

- [ ] **Step 1: Write the failing test — create `frontend/src/app/api/characters/__tests__/route.test.ts`**

```typescript
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    character: { findMany: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  project: { findFirst: jest.Mock }
  character: { findMany: jest.Mock; create: jest.Mock }
}

function authedRequest(url: string, init: RequestInit = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/characters', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/characters'))
    expect(response.status).toBe(401)
  })

  it('scopes a project-bound query by family, not just the caller', async () => {
    mockedPrisma.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    mockedPrisma.character.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/characters?projectId=proj-1'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj-1', user: { familyId: 'fam-1' } } })
    )
  })

  it('returns the family-wide library when no projectId is given', async () => {
    mockedPrisma.character.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/characters'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.character.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'fam-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
      })
    )
  })
})

describe('POST /api/characters', () => {
  it('creates a family-library character without a projectId', async () => {
    mockedPrisma.character.create.mockResolvedValue({ id: 'char-1' })
    const request = authedRequest('http://localhost/api/characters', {
      method: 'POST',
      body: JSON.stringify({ name: 'Elana', visibility: 'FAMILY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.character.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY', projectId: null }),
      })
    )
  })

  it('rejects an invalid visibility value', async () => {
    const request = authedRequest('http://localhost/api/characters', {
      method: 'POST',
      body: JSON.stringify({ name: 'Elana', visibility: 'PUBLIC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd frontend && npx jest src/app/api/characters/__tests__/route.test.ts`
Expected: FAIL — current implementation still checks `project.userId` (not `user.familyId`) and doesn't support the no-`projectId` library mode.

- [ ] **Step 3: Implement — replace `frontend/src/app/api/characters/route.ts` in full**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/characters?projectId=xxx - Charaktere eines Projekts, sonst die Familien-Bibliothek
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }

      const characters = await prisma.character.findMany({
        where: { projectId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(characters)
    }

    const characters = await prisma.character.findMany({
      where: { familyId: context.familyId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(characters)
  } catch (error) {
    logger.error(error, { route: 'GET /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Charaktere' }, { status: 500 })
  }
}

// POST /api/characters - Neuen Charakter erstellen (projektgebunden oder als Familien-Bibliothekseintrag)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { name, description, motivation, projectId, visibility } = body

    if (visibility !== undefined && visibility !== 'PRIVATE' && visibility !== 'FAMILY') {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }
    }

    const character = await prisma.character.create({
      data: {
        name: name || 'Neuer Charakter',
        description: description || '',
        motivation: motivation || '',
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/characters', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Charakters' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `cd frontend && npx jest src/app/api/characters/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace `frontend/src/app/api/characters/[id]/route.ts` in full (adds the missing PUT, rewrites DELETE)**

The frontend already calls `PUT /api/characters/${id}` (`useCharacters.ts` → `updateCharacter`) but this route only ever had `DELETE` — editing a character has been silently broken. Fixing it is required to make visibility actually editable.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// PUT /api/characters/[id] - Charakter aktualisieren (nur Autor)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const character = await prisma.character.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!character) {
      return NextResponse.json({ error: 'Charakter nicht gefunden' }, { status: 404 })
    }
    if (character.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, motivation, visibility } = body

    if (visibility !== undefined && visibility !== 'PRIVATE' && visibility !== 'FAMILY') {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (motivation !== undefined) updateData.motivation = motivation
    if (visibility !== undefined) updateData.visibility = visibility

    const updated = await prisma.character.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/characters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/characters/[id] - Charakter löschen (Autor oder Familien-OWNER)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const character = await prisma.character.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!character) {
      return NextResponse.json({ error: 'Charakter nicht gefunden' }, { status: 404 })
    }
    if (character.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.character.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/characters/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Update the frontend `Character` type — `frontend/src/app/components/types.ts`**

Replace:
```typescript
export interface Character {
  id: string
  name: string
  description: string | null
  motivation: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}
```

With:
```typescript
export interface Character {
  id: string
  name: string
  description: string | null
  motivation: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 7: Type-check and run the full suite**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: PASS. (`tsc` will flag any remaining place assuming `Character.projectId` is non-null — there are none outside this route today, but fix any that surface.)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/api/characters frontend/src/app/components/types.ts
git commit -m "feat: family-scoped character library with visibility, fix missing PUT /api/characters/[id]"
```

---

### Task 6: Place route — family scoping, visibility, shared library

**Files:**
- Modify: `frontend/src/app/api/places/route.ts`
- Modify: `frontend/src/app/api/places/[id]/route.ts`
- Modify: `frontend/src/app/components/types.ts` (Place interface only)
- Create: `frontend/src/app/api/places/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getAuthContext` (Task 2). Mirrors Task 5's Character design exactly (same family-scoping and visibility rules), applied to `Place`.

- [ ] **Step 1: Write the failing test — create `frontend/src/app/api/places/__tests__/route.test.ts`**

```typescript
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { signAuthToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    place: { findMany: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedPrisma = prisma as unknown as {
  project: { findFirst: jest.Mock }
  place: { findMany: jest.Mock; create: jest.Mock }
}

function authedRequest(url: string, init: RequestInit = {}) {
  process.env.JWT_SECRET = 'test-secret'
  const token = signAuthToken({ userId: 'user-1', email: 'a@example.com', familyId: 'fam-1', role: 'ADULT' })
  return new NextRequest(url, { ...init, headers: { ...(init.headers || {}), cookie: `auth-token=${token}` } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/places', () => {
  it('returns 401 without an auth cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/places'))
    expect(response.status).toBe(401)
  })

  it('scopes a project-bound query by family, not just the caller', async () => {
    mockedPrisma.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    mockedPrisma.place.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/places?projectId=proj-1'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj-1', user: { familyId: 'fam-1' } } })
    )
  })

  it('returns the family-wide library when no projectId is given', async () => {
    mockedPrisma.place.findMany.mockResolvedValue([])
    const response = await GET(authedRequest('http://localhost/api/places'))
    expect(response.status).toBe(200)
    expect(mockedPrisma.place.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'fam-1', OR: [{ visibility: 'FAMILY' }, { authorId: 'user-1' }] },
      })
    )
  })
})

describe('POST /api/places', () => {
  it('creates a family-library place without a projectId', async () => {
    mockedPrisma.place.create.mockResolvedValue({ id: 'place-1' })
    const request = authedRequest('http://localhost/api/places', {
      method: 'POST',
      body: JSON.stringify({ name: 'Eldoria', visibility: 'FAMILY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(mockedPrisma.place.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ familyId: 'fam-1', authorId: 'user-1', visibility: 'FAMILY', projectId: null }),
      })
    )
  })

  it('rejects an invalid visibility value', async () => {
    const request = authedRequest('http://localhost/api/places', {
      method: 'POST',
      body: JSON.stringify({ name: 'Eldoria', visibility: 'PUBLIC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd frontend && npx jest src/app/api/places/__tests__/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement — replace `frontend/src/app/api/places/route.ts` in full**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/places?projectId=xxx - Orte eines Projekts, sonst die Familien-Bibliothek
export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }

      const places = await prisma.place.findMany({
        where: { projectId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(places)
    }

    const places = await prisma.place.findMany({
      where: { familyId: context.familyId, OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }] },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(places)
  } catch (error) {
    logger.error(error, { route: 'GET /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Laden der Orte' }, { status: 500 })
  }
}

// POST /api/places - Neuen Ort erstellen (projektgebunden oder als Familien-Bibliothekseintrag)
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const body = await request.json()
    const { name, description, location, climate, importance, projectId, visibility } = body

    if (visibility !== undefined && visibility !== 'PRIVATE' && visibility !== 'FAMILY') {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, user: { familyId: context.familyId } },
      })
      if (!project) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }
    }

    const place = await prisma.place.create({
      data: {
        name: name || 'Neuer Ort',
        description: description || '',
        location: location || '',
        climate: climate || '',
        importance: importance || '',
        visibility: visibility || 'PRIVATE',
        projectId: projectId || null,
        familyId: context.familyId,
        authorId: context.userId,
      },
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    logger.error(error, { route: 'POST /api/places', userId })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Ortes' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `cd frontend && npx jest src/app/api/places/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace `frontend/src/app/api/places/[id]/route.ts` in full**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/places/[id] - Einzelnen Ort abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const place = await prisma.place.findFirst({
      where: {
        id: params.id,
        familyId: context.familyId,
        OR: [{ visibility: 'FAMILY' }, { authorId: context.userId }],
      },
    })
    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(place)
  } catch (error) {
    logger.error(error, { route: 'GET /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Laden des Ortes' }, { status: 500 })
  }
}

// PUT /api/places/[id] - Ort aktualisieren (nur Autor)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const place = await prisma.place.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }
    if (place.authorId !== context.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, location, climate, importance, visibility } = body

    if (visibility !== undefined && visibility !== 'PRIVATE' && visibility !== 'FAMILY') {
      return NextResponse.json({ error: 'Sichtbarkeit muss PRIVATE oder FAMILY sein' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (climate !== undefined) updateData.climate = climate
    if (importance !== undefined) updateData.importance = importance
    if (visibility !== undefined) updateData.visibility = visibility

    const updated = await prisma.place.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(error, { route: 'PUT /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/places/[id] - Ort löschen (Autor oder Familien-OWNER)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null
  try {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    userId = context.userId

    const place = await prisma.place.findFirst({
      where: { id: params.id, familyId: context.familyId },
    })
    if (!place) {
      return NextResponse.json({ error: 'Ort nicht gefunden' }, { status: 404 })
    }
    if (place.authorId !== context.userId && context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await prisma.place.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error, { route: 'DELETE /api/places/[id]', userId })
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Update the frontend `Place` type — `frontend/src/app/components/types.ts`**

Replace:
```typescript
export interface Place {
  id: string
  name: string
  description: string | null
  location: string | null
  climate: string | null
  importance: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}
```

With:
```typescript
export interface Place {
  id: string
  name: string
  description: string | null
  location: string | null
  climate: string | null
  importance: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 7: Type-check and run the full suite**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/api/places frontend/src/app/components/types.ts
git commit -m "feat: family-scoped place library with visibility"
```

---

### Task 7: Frontend — visibility selector + Family page

**Files:**
- Modify: `frontend/src/app/hooks/useCharacters.ts`
- Modify: `frontend/src/app/hooks/usePlaces.ts`
- Modify: `frontend/src/app/components/AddCharacterModal.tsx`
- Modify: `frontend/src/app/components/EditCharacterModal.tsx`
- Modify: `frontend/src/app/components/AddPlaceModal.tsx`
- Create: `frontend/src/app/family/page.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/family/members` (Task 4), the extended `Character`/`Place` shape (Tasks 5–6).
- Produces: users can set PRIVATE/FAMILY visibility when creating/editing a Character or creating a Place; an OWNER can add family members from a new `/family` page.

No new automated tests in this task — it's UI wiring over already-tested API routes. Verify manually per the steps below (this repo has no component test for existing modals either, e.g. `AddPlaceModal.tsx` has no test file — consistent with existing convention).

- [ ] **Step 1: Thread `visibility` through `frontend/src/app/hooks/useCharacters.ts`**

Replace:
```typescript
  const addCharacter = async (name: string, description: string, motivation: string) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, motivation, projectId: selectedProject.id })
      })
```

With:
```typescript
  const addCharacter = async (name: string, description: string, motivation: string, visibility: 'PRIVATE' | 'FAMILY') => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, motivation, visibility, projectId: selectedProject.id })
      })
```

Replace:
```typescript
  const updateCharacter = async (id: string, name: string, description: string, motivation: string) => {
    try {
      const response = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, motivation })
      })
```

With:
```typescript
  const updateCharacter = async (id: string, name: string, description: string, motivation: string, visibility: 'PRIVATE' | 'FAMILY') => {
    try {
      const response = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, motivation, visibility })
      })
```

- [ ] **Step 2: Thread `visibility` through `frontend/src/app/hooks/usePlaces.ts`**

Replace:
```typescript
  const addPlace = async (name: string, description: string, location: string, climate: string, importance: string) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, climate, importance, projectId: selectedProject.id })
      })
```

With:
```typescript
  const addPlace = async (name: string, description: string, location: string, climate: string, importance: string, visibility: 'PRIVATE' | 'FAMILY') => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, climate, importance, visibility, projectId: selectedProject.id })
      })
```

- [ ] **Step 3: Add the visibility selector to `frontend/src/app/components/AddCharacterModal.tsx`**

Replace:
```typescript
interface AddCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, description: string, motivation: string) => void
}

export function AddCharacterModal({ isOpen, onClose, onAdd }: AddCharacterModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, motivation)
    setName('')
    setDescription('')
    setMotivation('')
    onClose()
  }
```

With:
```typescript
interface AddCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, description: string, motivation: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function AddCharacterModal({ isOpen, onClose, onAdd }: AddCharacterModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, motivation, visibility)
    setName('')
    setDescription('')
    setMotivation('')
    setVisibility('PRIVATE')
    onClose()
  }
```

Replace the submit button block:
```typescript
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Hinzufügen
            </button>
          </div>
```

With:
```typescript
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sichtbarkeit
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'FAMILY')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
            >
              <option value="PRIVATE">Privat (nur ich)</option>
              <option value="FAMILY">Familie (alle Familienmitglieder)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Hinzufügen
            </button>
          </div>
```

- [ ] **Step 4: Add the visibility selector to `frontend/src/app/components/EditCharacterModal.tsx`**

Replace:
```typescript
interface EditCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  onUpdate: (id: string, name: string, description: string, motivation: string) => void
}

export function EditCharacterModal({ isOpen, onClose, character, onUpdate }: EditCharacterModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')

  React.useEffect(() => {
    if (character) {
      setName(character.name)
      setDescription(character.description || '')
      setMotivation(character.motivation || '')
    }
  }, [character])

  if (!isOpen || !character) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(character.id, name, description, motivation)
    onClose()
  }
```

With:
```typescript
interface EditCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  onUpdate: (id: string, name: string, description: string, motivation: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function EditCharacterModal({ isOpen, onClose, character, onUpdate }: EditCharacterModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  React.useEffect(() => {
    if (character) {
      setName(character.name)
      setDescription(character.description || '')
      setMotivation(character.motivation || '')
      setVisibility(character.visibility)
    }
  }, [character])

  if (!isOpen || !character) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(character.id, name, description, motivation, visibility)
    onClose()
  }
```

Replace the submit button block (same shape as Step 3, "Speichern" label):
```typescript
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Speichern
            </button>
          </div>
```

With:
```typescript
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sichtbarkeit
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'FAMILY')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
            >
              <option value="PRIVATE">Privat (nur ich)</option>
              <option value="FAMILY">Familie (alle Familienmitglieder)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Speichern
            </button>
          </div>
```

- [ ] **Step 5: Add the visibility selector to `frontend/src/app/components/AddPlaceModal.tsx`**

Replace:
```typescript
interface AddPlaceModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, description: string, location: string, climate: string, importance: string) => void
}

export function AddPlaceModal({ isOpen, onClose, onAdd }: AddPlaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [climate, setClimate] = useState('')
  const [importance, setImportance] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, location, climate, importance)
    setName('')
    setDescription('')
    setLocation('')
    setClimate('')
    setImportance('')
    onClose()
  }
```

With:
```typescript
interface AddPlaceModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, description: string, location: string, climate: string, importance: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function AddPlaceModal({ isOpen, onClose, onAdd }: AddPlaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [climate, setClimate] = useState('')
  const [importance, setImportance] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, location, climate, importance, visibility)
    setName('')
    setDescription('')
    setLocation('')
    setClimate('')
    setImportance('')
    setVisibility('PRIVATE')
    onClose()
  }
```

Replace the submit button block:
```typescript
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Hinzufügen
            </button>
          </div>
```

With:
```typescript
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sichtbarkeit
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'FAMILY')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
            >
              <option value="PRIVATE">Privat (nur ich)</option>
              <option value="FAMILY">Familie (alle Familienmitglieder)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Hinzufügen
            </button>
          </div>
```

- [ ] **Step 6: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — `page.tsx` passes `onAdd={addCharacter}`/`onUpdate={updateCharacter}`/`onAdd={addPlace}` directly by reference (no wrapper), so the widened signatures satisfy the modal props without touching `page.tsx`.

- [ ] **Step 7: Create the Family page — `frontend/src/app/family/page.tsx`**

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'

interface Member {
  id: string
  email: string
  name: string | null
  role: 'OWNER' | 'ADULT' | 'CHILD'
  createdAt: string
}

export default function FamilyPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'ADULT' | 'CHILD'>('ADULT')

  useEffect(() => {
    const load = async () => {
      try {
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.user) {
          router.replace('/login')
          return
        }
        setCurrentUserId(authData.user.id)

        const membersRes = await fetch('/api/family/members')
        if (!membersRes.ok) {
          setError('Familienmitglieder konnten nicht geladen werden.')
          return
        }
        setMembers(await membersRes.json())
      } catch {
        setError('Familienmitglieder konnten nicht geladen werden.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const currentUser = members.find((m) => m.id === currentUserId)
  const isOwner = currentUser?.role === 'OWNER'

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const response = await fetch('/api/family/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Familienmitglied konnte nicht angelegt werden.')
        return
      }
      setMembers([...members, data])
      setEmail('')
      setPassword('')
      setName('')
      setRole('ADULT')
      setShowAddForm(false)
    } catch {
      setError('Familienmitglied konnte nicht angelegt werden.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-900 dark:text-zinc-200" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 p-6 sm:p-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 mb-6 text-sm hover:underline"
        >
          <ArrowLeft size={16} />
          Zurück zum Dashboard
        </button>

        <div className="border-2 border-zinc-900 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-900 rounded-none shadow-[4px_4px_0_0_#18181b] dark:shadow-[4px_4px_0_0_#3f3f46] p-6">
          <h1 className="text-2xl font-bold mb-4">Familie</h1>

          {error && (
            <p className="mb-4 text-sm text-red-700 dark:text-red-400">{error}</p>
          )}

          <ul className="space-y-2 mb-6">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between border-zinc-900 dark:border-zinc-700 border-b py-2"
              >
                <div>
                  <p className="font-medium">{member.name || member.email}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{member.email}</p>
                </div>
                <span className="rounded-sm border border-zinc-900 dark:border-zinc-700 px-2 py-0.5 text-xs font-semibold">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>

          {isOwner && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UserPlus size={16} />
              Familienmitglied hinzufügen
            </button>
          )}

          {isOwner && showAddForm && (
            <form onSubmit={handleAddMember} className="space-y-3 border-t-2 border-zinc-900 dark:border-zinc-700 pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-Mail *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passwort * (min. 8 Zeichen)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rolle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADULT' | 'CHILD')}
                  className="w-full px-3 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="ADULT">Erwachsene:r</option>
                  <option value="CHILD">Kind</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 rounded-none border-2 border-zinc-900 dark:border-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Anlegen
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Add a nav link to `/family` in `frontend/src/app/dashboard/page.tsx`**

`Users` is already imported from `lucide-react` at the top of this file. Find the header block around the "Abmelden" (logout) button (currently near line 361) and add a family-nav button immediately before it:

Replace:
```typescript
                title="Abmelden"
```

With:
```typescript
                title="Familie"
              >
              </button>
              <button
                onClick={() => router.push('/family')}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Familie verwalten"
              >
                <Users size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Abmelden"
```

Before applying this replace, re-read `frontend/src/app/dashboard/page.tsx` lines 337–368 in the editor to confirm the exact surrounding JSX (the button's `onClick` handler name) — the file was only read in summarized form while writing this plan, so the exact handler name (`handleLogout` vs inline) must be confirmed against the live file, not assumed, before editing.

- [ ] **Step 9: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 10: Manual verification (no live DB in this sandbox — note this explicitly rather than skipping silently)**

Run: `cd frontend && npm run build`
Expected: build succeeds (build doesn't require a live DB connection, same as prior features). Full click-through (register → see own Family → add a CHILD member → create a FAMILY-visibility character → confirm both users see it) requires the real Docker/Postgres stack and is the user's manual acceptance step, per Task 1 Step 6.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/hooks/useCharacters.ts frontend/src/app/hooks/usePlaces.ts \
  frontend/src/app/components/AddCharacterModal.tsx frontend/src/app/components/EditCharacterModal.tsx \
  frontend/src/app/components/AddPlaceModal.tsx frontend/src/app/family frontend/src/app/dashboard/page.tsx
git commit -m "feat: visibility selector in character/place modals, Family management page"
```

---

## Self-Review Notes

- **Spec coverage:** Rollen-System → Tasks 1–4. Granulare Sichtbarkeitsstufen → Tasks 1, 5, 6, 7. Geteilte Charakter-/Welten-Datenbank → Tasks 1, 5, 6 (nullable `projectId` + family-wide `GET` with no `projectId`). Server-side role guard on every route → `getAuthContext`/`requireRole` used in Tasks 3–6, never UI-only. Neo-Brutalism directives → applied in Task 7's new `/family` page (the only wholly new page in this plan); existing modals keep their current styling except the added visibility `<select>`, styled to match their surrounding form (Phase 2 handles the full re-skin).
- **Known limitation carried forward on purpose:** role/familyId live in the JWT, so a role change (e.g. OWNER promotes a CHILD to ADULT) only takes effect after that member logs in again. Acceptable for Phase 1; revisit if Phase 3's Kids Mode needs same-session role changes.
- **Out of scope, confirmed deliberately:** editing a `Place` from the UI (no `EditPlaceModal` exists today — the backend `PUT` already existed before this plan and is now visibility-aware, but no frontend calls it; not a regression, a pre-existing gap). Sharing whole `Project`/`Chapter` records across the family (Phase 4/5 territory, not Phase 1).
