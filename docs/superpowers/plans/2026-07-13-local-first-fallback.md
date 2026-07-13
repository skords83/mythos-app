# Local-First Fallback für Kapitel-Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an IndexedDB-backed local backup for chapter editing that runs independently of the existing server autosave, so an unsaved edit survives an offline period, a failed save, or a crashed tab, and is offered back to the user on next load via a recovery banner.

**Architecture:** Two independent debounced write paths on every `editorContent` change in `useChapters.ts`: the existing 2s debounce to the server (`PUT /api/chapters/:id`, unchanged), and a new 300–500ms debounce to a local IndexedDB store (`frontend/src/lib/chapterDraftStore.ts`). On successful server save, the local draft is deleted. On chapter load, if a local draft is newer than the server's `updatedAt`, a `DraftRecoveryBanner` lets the user restore or discard it.

**Tech Stack:** Next.js 14 / React 18, TypeScript, `idb` (new dependency) for IndexedDB access, Jest + Testing Library + `fake-indexeddb` (new dev dependency) for tests.

Spec: `docs/superpowers/specs/2026-07-13-local-first-fallback-design.md`

## Global Constraints

- Local draft debounce is **300–500ms** (this plan uses **400ms** as the concrete value) — separate timer from the existing 2s server-save debounce, which stays unchanged.
- Local write is **always active** on every edit, independent of whether the server save succeeds — no online/offline detection, no error-triggered branch.
- Recovery UX is a **banner with an explicit user choice** (Wiederherstellen / Verwerfen) — never auto-restore, never auto-discard.
- Scope is **chapters only** (`RichTextEditor`/`ManuscriptView`/`useChapters`) — `useNotes` is out of scope.
- IndexedDB access goes through the **`idb`** package (thin promise wrapper) — not Dexie, not raw `indexedDB` calls in application code.
- **No background retry-on-reconnect** — recovery happens on next chapter load, not live within the same session without a reload.
- Draft content is a **plain HTML string** (`editor.getHTML()`), identical to `editorContent`/`Chapter.content` today — not Tiptap JSON.

---

### Task 1: `chapterDraftStore` — IndexedDB module

**Files:**
- Create: `frontend/src/lib/chapterDraftStore.ts`
- Test: `frontend/src/lib/__tests__/chapterDraftStore.test.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `interface ChapterDraft { chapterId: string; content: string; updatedAt: number }`, `saveDraft(chapterId: string, content: string): Promise<void>`, `getDraft(chapterId: string): Promise<ChapterDraft | undefined>`, `deleteDraft(chapterId: string): Promise<void>` — all exported from `frontend/src/lib/chapterDraftStore.ts`.

- [ ] **Step 1: Install dependencies**

Run from `frontend/`:
```bash
npm install idb
npm install --save-dev fake-indexeddb
```
Expected: `frontend/package.json` gains `"idb"` under `dependencies` and `"fake-indexeddb"` under `devDependencies`.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/lib/__tests__/chapterDraftStore.test.ts`:

```typescript
import 'fake-indexeddb/auto'
import { saveDraft, getDraft, deleteDraft } from '../chapterDraftStore'

describe('chapterDraftStore', () => {
  it('saves and retrieves a draft', async () => {
    await saveDraft('chapter-1', '<p>Hello</p>')
    const draft = await getDraft('chapter-1')
    expect(draft?.chapterId).toBe('chapter-1')
    expect(draft?.content).toBe('<p>Hello</p>')
    expect(typeof draft?.updatedAt).toBe('number')
  })

  it('returns undefined for a chapter with no draft', async () => {
    const draft = await getDraft('chapter-does-not-exist')
    expect(draft).toBeUndefined()
  })

  it('overwrites an existing draft for the same chapterId', async () => {
    await saveDraft('chapter-2', '<p>First</p>')
    await saveDraft('chapter-2', '<p>Second</p>')
    const draft = await getDraft('chapter-2')
    expect(draft?.content).toBe('<p>Second</p>')
  })

  it('deletes a draft', async () => {
    await saveDraft('chapter-3', '<p>Bye</p>')
    await deleteDraft('chapter-3')
    const draft = await getDraft('chapter-3')
    expect(draft).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx jest src/lib/__tests__/chapterDraftStore.test.ts`
Expected: FAIL — `Cannot find module '../chapterDraftStore'`

- [ ] **Step 4: Write the implementation**

Create `frontend/src/lib/chapterDraftStore.ts`:

```typescript
import { openDB, IDBPDatabase } from 'idb'

export interface ChapterDraft {
  chapterId: string
  content: string
  updatedAt: number
}

const DB_NAME = 'mythos-chapter-drafts'
const DB_VERSION = 1
const STORE_NAME = 'chapterDrafts'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'chapterId' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveDraft(chapterId: string, content: string): Promise<void> {
  const db = await getDb()
  const draft: ChapterDraft = { chapterId, content, updatedAt: Date.now() }
  await db.put(STORE_NAME, draft)
}

export async function getDraft(chapterId: string): Promise<ChapterDraft | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, chapterId)
}

export async function deleteDraft(chapterId: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, chapterId)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx jest src/lib/__tests__/chapterDraftStore.test.ts`
Expected: PASS — 4 tests passing

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/chapterDraftStore.ts frontend/src/lib/__tests__/chapterDraftStore.test.ts
git commit -m "feat: add chapterDraftStore IndexedDB module for local-first fallback"
```

---

### Task 2: Local draft debounce + cleanup wiring in `useChapters`

**Files:**
- Modify: `frontend/src/app/hooks/useChapters.ts`
- Test: Create `frontend/src/app/hooks/__tests__/useChapters.test.ts`

**Interfaces:**
- Consumes: `saveDraft`, `deleteDraft` from `frontend/src/lib/chapterDraftStore.ts` (Task 1).
- Produces: no new public hook fields yet — this task only adds the always-active local backup write and the delete-on-success cleanup. `pendingDraft`/`restoreDraft`/`discardDraft` are added in Task 3.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/hooks/__tests__/useChapters.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useChapters } from '../useChapters'
import { saveDraft, deleteDraft } from '@/lib/chapterDraftStore'
import type { Project, Chapter } from '../../components/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/lib/chapterDraftStore', () => ({
  saveDraft: jest.fn().mockResolvedValue(undefined),
  getDraft: jest.fn().mockResolvedValue(undefined),
  deleteDraft: jest.fn().mockResolvedValue(undefined),
}))

const mockSaveDraft = saveDraft as jest.Mock
const mockDeleteDraft = deleteDraft as jest.Mock

const project: Project = {
  id: 'p1',
  title: 'Projekt',
  description: null,
  wordGoal: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const chapter: Chapter = {
  id: 'c1',
  title: 'Kapitel 1',
  content: '<p>Server-Inhalt</p>',
  order: 0,
  wordCount: 2,
  projectId: 'p1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockInitialLoadFetch() {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chapters: [chapter] }) } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => chapter } as Response)
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

function renderChaptersHook() {
  return renderHook(() =>
    useChapters({
      selectedProject: project,
      showError: jest.fn(),
      requestConfirm: jest.fn(),
      onConfirmed: jest.fn(),
    })
  )
}

describe('useChapters — local draft fallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSaveDraft.mockClear()
    mockDeleteDraft.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('writes a local draft 400ms after an edit, independent of the server save', async () => {
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()
    mockSaveDraft.mockClear()

    act(() => { result.current.setEditorContent('<p>Neuer Inhalt</p>') })
    act(() => { jest.advanceTimersByTime(400) })
    await flush()

    expect(mockSaveDraft).toHaveBeenCalledWith('c1', '<p>Neuer Inhalt</p>')
  })

  it('deletes the local draft once saveChapter succeeds', async () => {
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => chapter } as Response)
    await act(async () => { await result.current.saveChapter() })

    expect(mockDeleteDraft).toHaveBeenCalledWith('c1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest src/app/hooks/__tests__/useChapters.test.ts`
Expected: FAIL — `mockSaveDraft`/`mockDeleteDraft` never called (the hook doesn't touch `chapterDraftStore` yet)

- [ ] **Step 3: Add the import and debounce ref**

In `frontend/src/app/hooks/useChapters.ts`, change the top imports (currently lines 1–4):

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chapter, Project } from '../components/types'
import { stripHtml } from '@/lib/text'
import { saveDraft, deleteDraft } from '@/lib/chapterDraftStore'
```

Add a new ref next to `editorSetContentRef` (inside `useChapters`, in the refs block):

```typescript
  const localDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- [ ] **Step 4: Add the local-draft debounce effect**

Immediately after the existing autosave `useEffect` (the one with `// Autosave: debounce 2s after last change`), add:

```typescript
  // Local-first fallback: always-active IndexedDB backup, independent of server-save outcome
  useEffect(() => {
    if (!selectedChapter) return
    if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    localDraftTimer.current = setTimeout(() => {
      saveDraft(selectedChapter.id, editorContent)
    }, 400)
    return () => {
      if (localDraftTimer.current) clearTimeout(localDraftTimer.current)
    }
  }, [editorContent, selectedChapter?.id])
```

- [ ] **Step 5: Delete the local draft after a successful server save**

In `saveChapter`, right after the existing `if (!response.ok) { showError(...); return }` block (before `setChapters(prev => ...)`), add:

```typescript
      await deleteDraft(chapter.id)
```

So that section reads:

```typescript
      if (!response.ok) {
        showError('Kapitel konnte nicht gespeichert werden.')
        return
      }
      await deleteDraft(chapter.id)
      setChapters(prev => prev.map(ch =>
        ch.id === chapter.id ? { ...ch, title: chapter.title, content, wordCount } : ch
      ))
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npx jest src/app/hooks/__tests__/useChapters.test.ts`
Expected: PASS — 2 tests passing

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/hooks/useChapters.ts frontend/src/app/hooks/__tests__/useChapters.test.ts
git commit -m "feat: write chapter edits to local IndexedDB backup independent of server autosave"
```

---

### Task 3: Draft recovery detection (`pendingDraft`/`restoreDraft`/`discardDraft`)

**Files:**
- Modify: `frontend/src/app/hooks/useChapters.ts`
- Modify: `frontend/src/app/hooks/__tests__/useChapters.test.ts`

**Interfaces:**
- Consumes: `getDraft`, `ChapterDraft` from `frontend/src/lib/chapterDraftStore.ts` (Task 1); `deleteDraft` already imported (Task 2).
- Produces: hook return now additionally includes `pendingDraft: ChapterDraft | null`, `restoreDraft: () => void`, `discardDraft: () => Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/app/hooks/__tests__/useChapters.test.ts` (update the import line first):

```typescript
import { saveDraft, getDraft, deleteDraft } from '@/lib/chapterDraftStore'
```

(replaces the Task 2 import line that only had `saveDraft, deleteDraft`)

Add a new describe block at the end of the file:

```typescript
describe('useChapters — draft recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSaveDraft.mockClear()
    mockDeleteDraft.mockClear()
    ;(getDraft as jest.Mock).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('exposes pendingDraft when IndexedDB has a newer unsynced draft than the server chapter', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    expect(result.current.pendingDraft?.chapterId).toBe('c1')
    expect(result.current.pendingDraft?.content).toBe('<p>Lokaler Entwurf</p>')
  })

  it('does not expose pendingDraft when the local draft is older than the server chapter', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Alter Entwurf</p>',
      updatedAt: new Date('2025-12-31T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    expect(result.current.pendingDraft).toBeNull()
    expect(mockDeleteDraft).toHaveBeenCalledWith('c1')
  })

  it('restoreDraft loads the draft content into the editor and clears pendingDraft', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    act(() => { result.current.restoreDraft() })

    expect(result.current.editorContent).toBe('<p>Lokaler Entwurf</p>')
    expect(result.current.pendingDraft).toBeNull()
  })

  it('discardDraft deletes the IndexedDB entry and clears pendingDraft', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    await act(async () => { await result.current.discardDraft() })

    expect(mockDeleteDraft).toHaveBeenCalledWith('c1')
    expect(result.current.pendingDraft).toBeNull()
  })
})
```

Also update the `jest.mock('@/lib/chapterDraftStore', ...)` factory at the top of the file (it already stubs `getDraft`, no change needed there since Task 2's mock already includes it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest src/app/hooks/__tests__/useChapters.test.ts`
Expected: FAIL — `result.current.pendingDraft`/`restoreDraft`/`discardDraft` are `undefined`

- [ ] **Step 3: Add `pendingDraft` state and import `getDraft`/`ChapterDraft`**

Change the import line from Task 2:

```typescript
import { saveDraft, deleteDraft } from '@/lib/chapterDraftStore'
```

to:

```typescript
import { saveDraft, getDraft, deleteDraft, ChapterDraft } from '@/lib/chapterDraftStore'
```

Add new state next to `autoSaveStatus`:

```typescript
  const [pendingDraft, setPendingDraft] = useState<ChapterDraft | null>(null)
```

- [ ] **Step 4: Check for a newer local draft on chapter load**

Replace `loadChapterContent`:

```typescript
  const loadChapterContent = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}`)
      if (!response.ok) return null
      const data = await response.json()
      const draft = await getDraft(chapterId)
      if (draft && draft.updatedAt > new Date(data.updatedAt).getTime()) {
        setPendingDraft(draft)
      } else {
        setPendingDraft(null)
        if (draft) await deleteDraft(chapterId)
      }
      return data
    } catch (error) {
      console.error('Error loading chapter content:', error)
      return null
    }
  }
```

- [ ] **Step 5: Clear pendingDraft when the project is cleared**

In the `useEffect(() => { if (selectedProject) {...} else {...} }, [selectedProject])` block, add `setPendingDraft(null)` to the `else` branch:

```typescript
  useEffect(() => {
    if (selectedProject) {
      loadChapters(selectedProject.id)
    } else {
      setChapters([])
      setSelectedChapter(null)
      setEditorContent('')
      setPendingDraft(null)
    }
  }, [selectedProject])
```

- [ ] **Step 6: Add `restoreDraft` and `discardDraft`, expose all three from the hook**

Add these two functions right before the `return` statement:

```typescript
  const restoreDraft = () => {
    if (!pendingDraft) return
    setEditorContent(pendingDraft.content)
    editorSetContentRef.current?.(pendingDraft.content)
    setPendingDraft(null)
  }

  const discardDraft = async () => {
    if (!pendingDraft) return
    await deleteDraft(pendingDraft.chapterId)
    setPendingDraft(null)
  }
```

Add `pendingDraft, restoreDraft, discardDraft,` to the hook's return object (next to `extractContent`).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend && npx jest src/app/hooks/__tests__/useChapters.test.ts`
Expected: PASS — 6 tests passing (2 from Task 2 + 4 new)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/hooks/useChapters.ts frontend/src/app/hooks/__tests__/useChapters.test.ts
git commit -m "feat: detect and expose newer unsynced local drafts on chapter load"
```

---

### Task 4: `DraftRecoveryBanner` component

**Files:**
- Create: `frontend/src/app/components/DraftRecoveryBanner.tsx`
- Test: `frontend/src/app/components/__tests__/DraftRecoveryBanner.test.tsx`

**Interfaces:**
- Consumes: `ChapterDraft` from `frontend/src/lib/chapterDraftStore.ts` (Task 1).
- Produces: `DraftRecoveryBanner({ draft: ChapterDraft, onRestore: () => void, onDiscard: () => void })` — a React component, default export not used, named export `DraftRecoveryBanner`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/components/__tests__/DraftRecoveryBanner.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DraftRecoveryBanner } from '../DraftRecoveryBanner'

const draft = {
  chapterId: 'c1',
  content: '<p>Draft</p>',
  updatedAt: new Date('2026-01-02T10:30:00.000Z').getTime(),
}

describe('DraftRecoveryBanner', () => {
  it('renders the recovery message', () => {
    render(<DraftRecoveryBanner draft={draft} onRestore={jest.fn()} onDiscard={jest.fn()} />)
    expect(screen.getByText(/Ungesicherter lokaler Entwurf/)).toBeInTheDocument()
  })

  it('calls onRestore when "Wiederherstellen" is clicked', () => {
    const onRestore = jest.fn()
    render(<DraftRecoveryBanner draft={draft} onRestore={onRestore} onDiscard={jest.fn()} />)
    fireEvent.click(screen.getByText('Wiederherstellen'))
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it('calls onDiscard when "Verwerfen" is clicked', () => {
    const onDiscard = jest.fn()
    render(<DraftRecoveryBanner draft={draft} onRestore={jest.fn()} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('Verwerfen'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/app/components/__tests__/DraftRecoveryBanner.test.tsx`
Expected: FAIL — `Cannot find module '../DraftRecoveryBanner'`

- [ ] **Step 3: Write the implementation**

Create `frontend/src/app/components/DraftRecoveryBanner.tsx`:

```tsx
'use client'

import { ChapterDraft } from '@/lib/chapterDraftStore'

interface DraftRecoveryBannerProps {
  draft: ChapterDraft
  onRestore: () => void
  onDiscard: () => void
}

export function DraftRecoveryBanner({ draft, onRestore, onDiscard }: DraftRecoveryBannerProps) {
  const formattedTime = new Date(draft.updatedAt).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <span>Ungesicherter lokaler Entwurf vom {formattedTime} gefunden.</span>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onRestore}
          className="rounded bg-amber-600 px-3 py-1 text-white transition-colors hover:bg-amber-700"
        >
          Wiederherstellen
        </button>
        <button
          onClick={onDiscard}
          className="rounded border border-amber-400 px-3 py-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          Verwerfen
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest src/app/components/__tests__/DraftRecoveryBanner.test.tsx`
Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/DraftRecoveryBanner.tsx frontend/src/app/components/__tests__/DraftRecoveryBanner.test.tsx
git commit -m "feat: add DraftRecoveryBanner component"
```

---

### Task 5: Wire the banner into `ManuscriptView` and `page.tsx`

**Files:**
- Modify: `frontend/src/app/components/ManuscriptView.tsx`
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `DraftRecoveryBanner` (Task 4); `pendingDraft`, `restoreDraft`, `discardDraft` from `useChapters` (Task 3).
- Produces: nothing further downstream — this is the final integration task for this sub-project.

- [ ] **Step 1: Extend `ManuscriptViewProps` and render the banner**

In `frontend/src/app/components/ManuscriptView.tsx`, add imports:

```typescript
import { ChapterDraft } from '@/lib/chapterDraftStore'
import { DraftRecoveryBanner } from './DraftRecoveryBanner'
```

Change the `ManuscriptViewProps` interface to:

```typescript
interface ManuscriptViewProps {
  selectedChapter: Chapter | null
  editorContent: string
  setEditorContent: (content: string) => void
  onTitleChange: (title: string) => void
  onCreateChapter: () => void
  editorSetContentRef: MutableRefObject<((content: string) => void) | null>
  pendingDraft: ChapterDraft | null
  onRestoreDraft: () => void
  onDiscardDraft: () => void
}
```

Change the function signature to destructure the new props:

```typescript
export function ManuscriptView({
  selectedChapter,
  editorContent,
  setEditorContent,
  onTitleChange,
  onCreateChapter,
  editorSetContentRef,
  pendingDraft,
  onRestoreDraft,
  onDiscardDraft,
}: ManuscriptViewProps) {
```

Render the banner above the title input, only when the pending draft belongs to the currently selected chapter:

```tsx
      {selectedChapter ? (
        <>
          {pendingDraft && pendingDraft.chapterId === selectedChapter.id && (
            <DraftRecoveryBanner draft={pendingDraft} onRestore={onRestoreDraft} onDiscard={onDiscardDraft} />
          )}
          <input
```

(the `<input>` line and everything below it through the closing `</>` stays exactly as before)

- [ ] **Step 2: Pass the new props from `page.tsx`**

In `frontend/src/app/page.tsx`, add the three new fields to the `useChapters` destructure (the block ending in `switchChapter,\n  } = useChapters(...)`):

```typescript
    editorSetContentRef,
    setChapterTitle,
    createChapter,
    saveChapter,
    deleteChapter,
    switchChapter,
    pendingDraft,
    restoreDraft,
    discardDraft,
  } = useChapters({ selectedProject, showError, requestConfirm, onConfirmed })
```

Update the `<ManuscriptView>` usage:

```tsx
            <ManuscriptView
              selectedChapter={selectedChapter}
              editorContent={editorContent}
              setEditorContent={setEditorContent}
              onTitleChange={setChapterTitle}
              onCreateChapter={createChapter}
              editorSetContentRef={editorSetContentRef}
              pendingDraft={pendingDraft}
              onRestoreDraft={restoreDraft}
              onDiscardDraft={discardDraft}
            />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors beyond the 3 pre-existing `TS2345`/`getSetCookie()` errors in test files (see `docs/superpowers/plans/2026-07-12-family-role-system.md` history — these are a known baseline, not introduced by this work)

- [ ] **Step 4: Run the full test suite**

Run: `cd frontend && npx jest`
Expected: PASS — all existing suites plus the 3 new files added in Tasks 1, 2/3, and 4

- [ ] **Step 5: Production build**

Run: `cd frontend && npm run build`
Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/components/ManuscriptView.tsx frontend/src/app/page.tsx
git commit -m "feat: show draft recovery banner in manuscript view when a newer local draft exists"
```
