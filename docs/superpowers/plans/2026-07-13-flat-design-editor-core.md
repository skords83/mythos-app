# Flat-Design Editor Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the mythos-app editor core (sidebars, manuscript editor, characters/places/notes views and their cards) from the current rounded/soft-shadow/green-accent look to the locked Neo-Brutalism/High-Contrast-Flat design system, via a shared `theme.ts` constants module — no behavior changes, no component-boundary changes.

**Architecture:** One new file (`frontend/src/lib/theme.ts`) exports named Tailwind class-string constants for the locked palette (zinc/stone/indigo, `rounded-none`, offset shadow, hard borders). Every subsequent task imports these constants into existing components instead of hardcoding Tailwind strings, replacing the current ad-hoc `gray-*`/`#4A7C59`/`rounded-lg`/`shadow-md` usage. Component boundaries and all props/behavior are unchanged — this is a pure className migration.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Jest + Testing Library.

## Global Constraints

- `rounded-none` everywhere, except small badges which use `rounded-sm` (spec: docs/superpowers/specs/2026-07-13-flat-design-editor-core-design.md).
- Offset shadow `shadow-[4px_4px_0_0_#18181b]` only on top-level interactive/card elements — never on nested children (icons, text, inline badges).
- No soft shadows (`shadow-md/lg/xl/sm/2xl`), no `backdrop-blur`, no gradients, no `/NN` background opacity — these are all soft/dimensional effects the flat design system explicitly excludes.
- Palette: `bg-stone-50`/`bg-stone-100` (light surfaces), `dark:bg-zinc-950`/`dark:bg-zinc-900` (dark surfaces), `text-zinc-900`/`dark:text-zinc-200` (primary text), `bg-indigo-600`/`hover:bg-indigo-700` (accent, replaces the old `#4A7C59` green).
- Sidebar panel edges use `border-r-2`/`border-l-2` with `zinc-900`/`zinc-700` (hard 2px panel border); other 1px borders use `zinc-300`/`zinc-700`.
- Scope: `LeftSidebar`, `RightSidebar`, `ChapterItem`, the `NavItem` helper (defined inside `ThemeToggle.tsx` but rendered by `LeftSidebar` — see Task 2 note), `ManuscriptView`, `RichTextEditor`, `WordProgress`, `DraftRecoveryBanner` (rendered inside `ManuscriptView` — see Task 3 note), `CharactersView`, `CharacterCard`, `CharacterListItem`, `CharacterQuickCard`, `PlacesView`, `PlaceCard`, `NotesView`, `NoteCard`.
- Out of scope: `ThemeToggle`/`FocusToggle` buttons themselves, `page.tsx` outer header/chrome, all modals, `Toast`, `ConfirmDialog`, `SearchModal`, `ExportModal`, dashboard, login — deferred to the follow-up "rest of the app" sub-project.
- No behavior changes. No new component abstractions — only className edits and the one new `theme.ts` module.
- Verification per task: `npx tsc --noEmit` clean, full Jest suite green (currently 69 tests; confirmed during brainstorming that none assert on Tailwind class strings). No live Docker/Postgres in this sandbox — no end-to-end browser walkthrough possible here, consistent with all prior sub-projects on this roadmap.

---

### Task 1: `theme.ts` design tokens

**Files:**
- Create: `frontend/src/lib/theme.ts`
- Test: `frontend/src/lib/__tests__/theme.test.ts`

**Interfaces:**
- Produces: named string exports `SURFACE`, `SURFACE_ALT`, `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, `ACCENT`, `ACCENT_TEXT`, `RADIUS`, `BADGE_RADIUS`, `CARD_SHADOW`, `BORDER`, `PANEL_BORDER_R`, `PANEL_BORDER_L`, `HOVER_SURFACE`, `ACTIVE_SURFACE`, `DIVIDER` — all subsequent tasks import from `@/lib/theme`.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/__tests__/theme.test.ts
import * as theme from '../theme'

describe('theme', () => {
  it('exports non-empty string constants for every design token', () => {
    const values = Object.values(theme)
    expect(values.length).toBeGreaterThan(0)
    values.forEach((value) => {
      expect(typeof value).toBe('string')
      expect((value as string).length).toBeGreaterThan(0)
    })
  })

  it('uses rounded-none as the default radius, not soft rounding', () => {
    expect(theme.RADIUS).toBe('rounded-none')
  })

  it('accent uses the locked indigo palette, not the old green', () => {
    expect(theme.ACCENT).toContain('indigo-600')
    expect(theme.ACCENT).not.toContain('4A7C59')
  })

  it('card shadow is a hard offset shadow, not a soft blur', () => {
    expect(theme.CARD_SHADOW).toBe('shadow-[4px_4px_0_0_#18181b]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/lib/__tests__/theme.test.ts`
Expected: FAIL — `Cannot find module '../theme'`

- [ ] **Step 3: Write the implementation**

```ts
// frontend/src/lib/theme.ts
// Neo-Brutalism / High-Contrast-Flat design tokens (locked 2026-07-12 roadmap decision).
// Import these instead of hardcoding Tailwind strings so the palette/radius/shadow
// formula stays byte-identical across every component.

export const SURFACE = 'bg-stone-50 dark:bg-zinc-950'
export const SURFACE_ALT = 'bg-stone-100 dark:bg-zinc-900'
export const TEXT_PRIMARY = 'text-zinc-900 dark:text-zinc-200'
export const TEXT_SECONDARY = 'text-zinc-600 dark:text-zinc-400'
export const TEXT_MUTED = 'text-zinc-400 dark:text-zinc-500'
export const ACCENT = 'bg-indigo-600 hover:bg-indigo-700'
export const ACCENT_TEXT = 'text-indigo-600 dark:text-indigo-400'
export const RADIUS = 'rounded-none'
export const BADGE_RADIUS = 'rounded-sm'
export const CARD_SHADOW = 'shadow-[4px_4px_0_0_#18181b]'
export const BORDER = 'border border-zinc-300 dark:border-zinc-700'
export const PANEL_BORDER_R = 'border-r-2 border-zinc-900 dark:border-zinc-700'
export const PANEL_BORDER_L = 'border-l-2 border-zinc-900 dark:border-zinc-700'
export const HOVER_SURFACE = 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
export const ACTIVE_SURFACE = 'bg-zinc-200 dark:bg-zinc-800'
export const DIVIDER = 'bg-zinc-300 dark:bg-zinc-700'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest src/lib/__tests__/theme.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Verify types and commit**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean (only the 3 pre-existing baseline `TS2345` errors, unrelated to this change)

```bash
git add frontend/src/lib/theme.ts frontend/src/lib/__tests__/theme.test.ts
git commit -m "feat: add flat-design theme constants module"
```

---

### Task 2: Sidebars — `LeftSidebar`, `RightSidebar`, `ChapterItem`, `NavItem`

**Files:**
- Modify: `frontend/src/app/components/LeftSidebar.tsx`
- Modify: `frontend/src/app/components/RightSidebar.tsx`
- Modify: `frontend/src/app/components/ChapterItem.tsx`
- Modify: `frontend/src/app/components/ThemeToggle.tsx` (only the `NavItem` export — `ThemeToggle`/`FocusToggle` stay untouched, out of scope)

**Note on scope:** `LeftSidebar` renders its main nav tabs (Manuskript/Charaktere/Orte/Notizen) via `NavItem`, which is defined in `ThemeToggle.tsx` alongside the (out-of-scope) `ThemeToggle`/`FocusToggle` buttons. `NavItem` is visually part of `LeftSidebar`'s own UI even though the export lives in a different file, so it's migrated here; the theme/focus toggle buttons themselves are left as-is per the approved spec's out-of-scope list.

**Interfaces:**
- Consumes: `SURFACE_ALT`, `TEXT_PRIMARY`, `RADIUS`, `HOVER_SURFACE`, `ACTIVE_SURFACE`, `PANEL_BORDER_R`, `PANEL_BORDER_L`, `CARD_SHADOW`, `BORDER`, `TEXT_SECONDARY`, `TEXT_MUTED`, `ACCENT_TEXT` from `@/lib/theme` (Task 1).

- [ ] **Step 1: Update `LeftSidebar.tsx` imports**

Old:
```tsx
import { NavItem } from './ThemeToggle'
import { WordProgress } from './WordProgress'
import { Project } from './types'
```
New:
```tsx
import { NavItem } from './ThemeToggle'
import { WordProgress } from './WordProgress'
import { Project } from './types'
import { SURFACE_ALT, TEXT_PRIMARY, RADIUS, HOVER_SURFACE } from '@/lib/theme'
```

- [ ] **Step 2: Flatten the `aside` panel**

Old:
```tsx
    <aside
      className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : leftSidebarOpen ? 'w-64' : 'w-16'} bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}
    >
```
New:
```tsx
    <aside
      className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : leftSidebarOpen ? 'w-64' : 'w-16'} ${SURFACE_ALT} border-r-2 border-zinc-900 dark:border-zinc-700 flex flex-col transition-all duration-300`}
    >
```

- [ ] **Step 3: Flatten the header block**

Old:
```tsx
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {leftSidebarOpen ? (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0">
```
New:
```tsx
      <div className="p-4 border-b border-zinc-300 dark:border-zinc-700">
        {leftSidebarOpen ? (
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-serif font-bold ${TEXT_PRIMARY} truncate flex-1 min-w-0`}>
```

- [ ] **Step 4: Flatten the four header icon buttons**

Old (appears 4 times, for `onGoToDashboard`, `onOpenSearch`, `onOpenEditProject`, `onOpenExport` — replace each occurrence):
```tsx
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
```
New:
```tsx
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
```

- [ ] **Step 5: Flatten the two collapse-toggle buttons**

Old (appears twice — expanded-state toggle and collapsed-state toggle):
```tsx
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
```
New:
```tsx
              className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
```

- [ ] **Step 6: Flatten the footer border**

Old:
```tsx
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
```
New:
```tsx
        <div className="p-4 border-t border-zinc-300 dark:border-zinc-700">
```

- [ ] **Step 7: Update `ThemeToggle.tsx` — flatten `NavItem` only**

Old (imports):
```tsx
import React, { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
```
New:
```tsx
import React, { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { RADIUS } from '@/lib/theme'
```

Old (`NavItem` function body):
```tsx
export function NavItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active 
          ? 'bg-[#4A7C59] text-white' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
```
New:
```tsx
export function NavItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 ${RADIUS} transition-colors ${
        active 
          ? 'bg-indigo-600 text-white' 
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
      }`}
    >
```
(The button body below this line — the icon and `{!collapsed && <span>{label}</span>}` — is unchanged; only the className template literal changes.)

- [ ] **Step 8: Update `RightSidebar.tsx` imports**

Old:
```tsx
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { ChapterItem } from './ChapterItem'
import { CharacterListItem } from './CharacterListItem'
import { Chapter, Character } from './types'
```
New:
```tsx
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { ChapterItem } from './ChapterItem'
import { CharacterListItem } from './CharacterListItem'
import { Chapter, Character } from './types'
import { SURFACE_ALT, CARD_SHADOW, RADIUS, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, HOVER_SURFACE } from '@/lib/theme'
```

- [ ] **Step 9: Flatten the `RightSidebar` panel**

Old:
```tsx
      <aside
        className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : rightSidebarOpen ? 'w-80' : 'w-0'} bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col`}
      >
```
New:
```tsx
      <aside
        className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : rightSidebarOpen ? 'w-80' : 'w-0'} ${SURFACE_ALT} border-l-2 border-zinc-900 dark:border-zinc-700 overflow-hidden transition-all duration-300 flex flex-col`}
      >
```

- [ ] **Step 10: Flatten the collapse-toggle button (inside panel)**

Old:
```tsx
              className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 bg-white dark:bg-[#262626] p-2 rounded-l-lg shadow-md border border-r-0 border-gray-200 dark:border-gray-700"
```
New:
```tsx
              className={`absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 ${SURFACE_ALT} p-2 ${RADIUS} ${CARD_SHADOW} border-2 border-r-0 border-zinc-900 dark:border-zinc-700`}
```

- [ ] **Step 11: Flatten section headers and "add" buttons**

Old (appears twice, for "Kapitel" and "Charaktere" sections):
```tsx
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
```
New:
```tsx
                  <h3 className={`text-sm font-semibold ${TEXT_SECONDARY} uppercase tracking-wider`}>
```

Old (appears twice, for `onCreateChapter` and `onAddCharacterClick` buttons):
```tsx
                  <button onClick={onCreateChapter} className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors" title="Neues Kapitel">
```
```tsx
                  <button onClick={onAddCharacterClick} className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors" title="Neuer Charakter">
```
New (same two lines, only the className changes):
```tsx
                  <button onClick={onCreateChapter} className={`p-1.5 ${ACCENT_TEXT} ${HOVER_SURFACE} ${RADIUS} transition-colors`} title="Neues Kapitel">
```
```tsx
                  <button onClick={onAddCharacterClick} className={`p-1.5 ${ACCENT_TEXT} ${HOVER_SURFACE} ${RADIUS} transition-colors`} title="Neuer Charakter">
```

- [ ] **Step 12: Flatten empty-state text**

Old (appears twice):
```tsx
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Noch keine Kapitel</p>
```
```tsx
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Noch keine Charaktere</p>
```
New:
```tsx
                  <p className={`text-sm ${TEXT_MUTED} text-center py-4`}>Noch keine Kapitel</p>
```
```tsx
                  <p className={`text-sm ${TEXT_MUTED} text-center py-4`}>Noch keine Charaktere</p>
```

- [ ] **Step 13: Flatten the collapsed-state re-open button**

Old:
```tsx
          className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#262626] p-2 rounded-l-lg shadow-md border border-r-0 border-gray-200 dark:border-gray-700 z-50"
```
New:
```tsx
          className={`fixed right-0 top-1/2 transform -translate-y-1/2 ${SURFACE_ALT} p-2 ${RADIUS} ${CARD_SHADOW} border-2 border-r-0 border-zinc-900 dark:border-zinc-700 z-50`}
```

- [ ] **Step 14: Update `ChapterItem.tsx`**

Old:
```tsx
import React from 'react'
import { Trash2 } from 'lucide-react'
import { Chapter } from './types'
```
New:
```tsx
import React from 'react'
import { Trash2 } from 'lucide-react'
import { Chapter } from './types'
import { RADIUS, TEXT_MUTED } from '@/lib/theme'
```

Old:
```tsx
    <div className={`group relative w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
      active 
        ? 'bg-[#4A7C59]/10 text-[#4A7C59] border-l-4 border-[#4A7C59]' 
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}>
```
New:
```tsx
    <div className={`group relative w-full text-left px-4 py-3 ${RADIUS} transition-colors flex items-center justify-between ${
      active 
        ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600' 
        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
    }`}>
```

Old:
```tsx
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
```
New:
```tsx
        <div className={`text-xs ${TEXT_MUTED} mt-1`}>
```

- [ ] **Step 15: Run full verification**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: `tsc` clean (only pre-existing baseline errors), all Jest suites green (no test in this suite asserts on the changed class strings — confirmed during brainstorming).

- [ ] **Step 16: Commit**

```bash
git add frontend/src/app/components/LeftSidebar.tsx frontend/src/app/components/RightSidebar.tsx frontend/src/app/components/ChapterItem.tsx frontend/src/app/components/ThemeToggle.tsx
git commit -m "feat: apply flat-design theme to sidebars, chapter list, and nav items"
```

---

### Task 3: Manuscript editor — `ManuscriptView`, `RichTextEditor`, `WordProgress`, `DraftRecoveryBanner`

**Files:**
- Modify: `frontend/src/app/components/ManuscriptView.tsx`
- Modify: `frontend/src/app/components/RichTextEditor.tsx`
- Modify: `frontend/src/app/components/WordProgress.tsx`
- Modify: `frontend/src/app/components/DraftRecoveryBanner.tsx`

**Note on scope:** `DraftRecoveryBanner` wasn't in the original spec's component list, but it renders directly inside `ManuscriptView`'s content area — leaving its `rounded-lg`/`rounded` corners untouched would create a visibly inconsistent seam right in the middle of the newly-flattened editor. Only its radius changes here; its amber warning color is semantic (not part of the neutral/accent palette) and stays as-is.

**Interfaces:**
- Consumes: `SURFACE`, `SURFACE_ALT`, `TEXT_PRIMARY`, `TEXT_MUTED`, `RADIUS`, `BORDER`, `ACCENT`, `ACCENT_TEXT`, `HOVER_SURFACE`, `ACTIVE_SURFACE`, `DIVIDER` from `@/lib/theme` (Task 1).

- [ ] **Step 1: Update `ManuscriptView.tsx`**

Old:
```tsx
import { MutableRefObject } from 'react'
import { RichTextEditor } from './RichTextEditor'
import { Chapter } from './types'
import { ChapterDraft } from '@/lib/chapterDraftStore'
import { DraftRecoveryBanner } from './DraftRecoveryBanner'
```
New:
```tsx
import { MutableRefObject } from 'react'
import { RichTextEditor } from './RichTextEditor'
import { Chapter } from './types'
import { ChapterDraft } from '@/lib/chapterDraftStore'
import { DraftRecoveryBanner } from './DraftRecoveryBanner'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'
```

Old:
```tsx
            placeholder="Kapiteltitel..."
            value={selectedChapter.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-600 text-gray-800 dark:text-gray-100 mb-8"
          />
```
New:
```tsx
            placeholder="Kapiteltitel..."
            value={selectedChapter.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={`w-full text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder-zinc-400 dark:placeholder-zinc-600 ${TEXT_PRIMARY} mb-8`}
          />
```

Old:
```tsx
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>Erstelle ein neues Kapitel, um zu beginnen.</p>
          <button
            onClick={onCreateChapter}
            className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
          >
```
New:
```tsx
        <div className={`text-center py-12 ${TEXT_MUTED}`}>
          <p>Erstelle ein neues Kapitel, um zu beginnen.</p>
          <button
            onClick={onCreateChapter}
            className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
          >
```

- [ ] **Step 2: Update `DraftRecoveryBanner.tsx`**

Old:
```tsx
    <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
```
New:
```tsx
    <div className="mb-6 flex items-center justify-between gap-4 rounded-none border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
```

Old:
```tsx
          className="rounded bg-amber-600 px-3 py-1 text-white transition-colors hover:bg-amber-700"
```
New:
```tsx
          className="rounded-none bg-amber-600 px-3 py-1 text-white transition-colors hover:bg-amber-700"
```

Old:
```tsx
          className="rounded border border-amber-400 px-3 py-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900"
```
New:
```tsx
          className="rounded-none border border-amber-400 px-3 py-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900"
```

- [ ] **Step 3: Update `RichTextEditor.tsx` imports**

Old:
```tsx
import { Bold, Italic, List, Quote, Heading1, Heading2, Undo, Redo, Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
```
New:
```tsx
import { Bold, Italic, List, Quote, Heading1, Heading2, Undo, Redo, Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SURFACE, SURFACE_ALT, RADIUS, BORDER, ACCENT_TEXT, HOVER_SURFACE, ACTIVE_SURFACE, DIVIDER } from '@/lib/theme'
```

- [ ] **Step 4: Flatten the editor wrapper and toolbar background**

Old:
```tsx
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1A1A1B]">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#262626]">
```
New:
```tsx
    <div className={`${BORDER} ${RADIUS} overflow-hidden ${SURFACE}`}>
      <div className={`flex items-center gap-1 p-2 border-b border-zinc-300 dark:border-zinc-700 ${SURFACE_ALT}`}>
```

- [ ] **Step 5: Flatten the 8 toolbar buttons' active/hover state**

Old (this exact pattern repeats for bold, italic, heading1, heading2, bulletList, blockquote — 6 occurrences, only the `editor.isActive(...)` call differs each time):
```tsx
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''}`}
```
New (apply the same substitution to each of the 6 buttons, keeping each button's own `editor.isActive(...)` condition unchanged):
```tsx
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('bold') ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
```

- [ ] **Step 6: Flatten the two toolbar dividers**

Old (appears twice):
```tsx
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
```
New:
```tsx
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
```

- [ ] **Step 7: Flatten undo/redo/image buttons**

Old (undo):
```tsx
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
```
Old (redo — identical string, appears a second time):
```tsx
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
```
New (apply to both):
```tsx
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors disabled:opacity-50`}
```

Old (image-upload button):
```tsx
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
```
New:
```tsx
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
```

- [ ] **Step 8: Update `WordProgress.tsx`**

Old:
```tsx
import React from 'react'

interface WordProgressProps {
```
New:
```tsx
import React from 'react'
import { TEXT_PRIMARY, TEXT_MUTED, SURFACE_ALT, RADIUS, BORDER } from '@/lib/theme'

interface WordProgressProps {
```

Old (background-track circle):
```tsx
            className="text-gray-100 dark:text-gray-800"
```
New:
```tsx
            className="text-stone-200 dark:text-zinc-800"
```

Old (progress circle):
```tsx
            className="text-[#6B9E7C] dark:text-[#6B9E7C] transition-all duration-1000 ease-out"
```
New:
```tsx
            className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-out"
```
(Only these two `className` attributes change — `cx`/`cy`/`r`/`stroke`/`strokeWidth`/`fill`/`strokeDasharray`/`strokeDashoffset`/`strokeLinecap` on both `<circle>` elements stay exactly as they are.)

Old:
```tsx
          <span className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
```
New:
```tsx
          <span className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>
```

Old:
```tsx
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
```
New:
```tsx
      <p className={`text-xs ${TEXT_MUTED} mt-2 text-center`}>
```

Old (`FloatingToolbar` — same file, currently unused/dead per prior audit but still exported; flatten for consistency since it shares the file):
```tsx
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#262626] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1 z-50 animate-fade-in">
```
New:
```tsx
    <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 ${SURFACE_ALT} ${RADIUS} ${BORDER} px-2 py-1 flex gap-1 z-50 animate-fade-in`}>
```

Old (4 buttons inside `FloatingToolbar`, identical string):
```tsx
      <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Bold">
```
New (apply the same substitution to all 4 — Bold/Italic/List/Quote):
```tsx
      <button className={`p-2 ${RADIUS} hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors`} title="Bold">
```

Old:
```tsx
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
```
New:
```tsx
      <div className={`w-px h-6 ${DIVIDER} mx-1`} />
```

- [ ] **Step 9: Run full verification**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: `tsc` clean (only pre-existing baseline errors), all Jest suites green (`WordProgress.test.tsx` and `DraftRecoveryBanner.test.tsx` don't assert on class strings — confirmed during brainstorming).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/app/components/ManuscriptView.tsx frontend/src/app/components/RichTextEditor.tsx frontend/src/app/components/WordProgress.tsx frontend/src/app/components/DraftRecoveryBanner.tsx
git commit -m "feat: apply flat-design theme to manuscript editor and draft recovery banner"
```

---

### Task 4: Characters — `CharactersView`, `CharacterCard`, `CharacterListItem`, `CharacterQuickCard`

**Files:**
- Modify: `frontend/src/app/components/CharactersView.tsx`
- Modify: `frontend/src/app/components/CharacterCard.tsx`
- Modify: `frontend/src/app/components/CharacterListItem.tsx`
- Modify: `frontend/src/app/components/CharacterQuickCard.tsx`

**Interfaces:**
- Consumes: `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, `ACCENT`, `ACCENT_TEXT`, `RADIUS`, `BADGE_RADIUS`, `CARD_SHADOW`, `BORDER`, `SURFACE_ALT`, `HOVER_SURFACE` from `@/lib/theme` (Task 1).

- [ ] **Step 1: Update `CharactersView.tsx`**

Old:
```tsx
import { Plus, Users } from 'lucide-react'
import { CharacterCard } from './CharacterCard'
import { Character } from './types'
```
New:
```tsx
import { Plus, Users } from 'lucide-react'
import { CharacterCard } from './CharacterCard'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'
```

Old:
```tsx
        <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Charaktere</h2>
        <button
          onClick={onAddClick}
          className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
        >
```
New:
```tsx
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Charaktere</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
```

Old:
```tsx
          <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
            <Users ... />
            <p>Noch keine Charaktere vorhanden.</p>
            <button onClick={onAddClick} className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors">
```
New:
```tsx
          <div className={`col-span-2 text-center py-12 ${TEXT_MUTED}`}>
            <Users ... />
            <p>Noch keine Charaktere vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
```
(Keep the `<Users ... />` icon element exactly as it is — only surrounding `className` strings change.)

- [ ] **Step 2: Update `CharacterCard.tsx`**

Old:
```tsx
import React from 'react'
import { Trash2 } from 'lucide-react'
import { Character } from './types'
```
New:
```tsx
import React from 'react'
import { Trash2 } from 'lucide-react'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT_TEXT, RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'
```

Old:
```tsx
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white font-semibold flex-shrink-0">
```
New:
```tsx
    <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
```
(The `card-hover` class is removed — it applied a soft `translateY` + box-shadow hover effect in `globals.css` that directly contradicts the flat/hard-edge design; the new offset `CARD_SHADOW` replaces it as the card's static visual weight. `ProjectCard.tsx`, out of scope, keeps using `card-hover` from `globals.css` unchanged.)

Old:
```tsx
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{character.name}</h4>
```
New:
```tsx
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{character.name}</h4>
```

Old:
```tsx
          {character.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{character.description}</p>
          )}
          {character.motivation && (
            <p className="text-xs text-[#4A7C59] mt-2 italic">„{character.motivation}"</p>
          )}
```
New:
```tsx
          {character.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{character.description}</p>
          )}
          {character.motivation && (
            <p className={`text-xs ${ACCENT_TEXT} mt-2 italic`}>„{character.motivation}"</p>
          )}
```

- [ ] **Step 3: Update `CharacterListItem.tsx`**

Old:
```tsx
import React from 'react'
import { Character } from './types'
```
New:
```tsx
import React from 'react'
import { Character } from './types'
import { RADIUS, ACCENT, HOVER_SURFACE } from '@/lib/theme'
```

Old:
```tsx
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {character.name.charAt(0)}
      </div>
      <span className="truncate text-sm text-gray-700 dark:text-gray-300">{character.name}</span>
```
New:
```tsx
      className={`w-full flex items-center gap-2 px-2 py-1.5 ${RADIUS} ${HOVER_SURFACE} transition-colors text-left`}
    >
      <div className={`w-6 h-6 ${RADIUS} ${ACCENT} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
        {character.name.charAt(0)}
      </div>
      <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{character.name}</span>
```

- [ ] **Step 4: Update `CharacterQuickCard.tsx`**

Old:
```tsx
import React from 'react'
import { Character } from './types'
```
New:
```tsx
import React from 'react'
import { Character } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, ACCENT, RADIUS, BORDER, CARD_SHADOW } from '@/lib/theme'
```

Old:
```tsx
        className="fixed z-50 bg-white dark:bg-[#262626] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 animate-fade-in"
```
New:
```tsx
        className={`fixed z-50 bg-white dark:bg-zinc-900 ${RADIUS} ${CARD_SHADOW} ${BORDER} p-4 w-72 animate-fade-in`}
```

Old:
```tsx
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
```
New:
```tsx
          <div className={`w-14 h-14 ${RADIUS} ${ACCENT} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
```

Old:
```tsx
            <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
              {state.character.name}
            </h3>
            <span className="text-xs text-[#4A7C59] font-medium">Charakter</span>
```
New:
```tsx
            <h3 className={`font-serif font-bold text-lg ${TEXT_PRIMARY} truncate`}>
              {state.character.name}
            </h3>
            <span className={`text-xs ${ACCENT_TEXT} font-medium`}>Charakter</span>
```

Old:
```tsx
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
```
New:
```tsx
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
```

Old (appears twice, "Beschreibung" and "Motivation" section labels):
```tsx
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
```
New:
```tsx
              <h4 className={`text-xs font-semibold ${TEXT_SECONDARY} uppercase tracking-wider mb-1`}>
```

Old:
```tsx
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {state.character.description}
              </p>
```
New:
```tsx
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {state.character.description}
              </p>
```

Old:
```tsx
              <p className="text-sm text-[#4A7C59] italic leading-relaxed">
                "{state.character.motivation}"
              </p>
```
New:
```tsx
              <p className={`text-sm ${ACCENT_TEXT} italic leading-relaxed`}>
                "{state.character.motivation}"
              </p>
```

Old:
```tsx
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 text-center">
```
New:
```tsx
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <p className={`text-xs ${TEXT_MUTED} text-center`}>
```

- [ ] **Step 5: Run full verification**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: `tsc` clean (only pre-existing baseline errors), all Jest suites green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/components/CharactersView.tsx frontend/src/app/components/CharacterCard.tsx frontend/src/app/components/CharacterListItem.tsx frontend/src/app/components/CharacterQuickCard.tsx
git commit -m "feat: apply flat-design theme to character views and cards"
```

---

### Task 5: Places — `PlacesView`, `PlaceCard`

**Files:**
- Modify: `frontend/src/app/components/PlacesView.tsx`
- Modify: `frontend/src/app/components/PlaceCard.tsx`

**Interfaces:**
- Consumes: `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, `ACCENT`, `ACCENT_TEXT`, `RADIUS`, `BADGE_RADIUS`, `BORDER`, `CARD_SHADOW` from `@/lib/theme` (Task 1).

- [ ] **Step 1: Update `PlacesView.tsx`**

Old:
```tsx
import { MapPin, Plus } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import { Place } from './types'
```
New:
```tsx
import { MapPin, Plus } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import { Place } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'
```

Old:
```tsx
        <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Orte</h2>
        <button
          onClick={onAddClick}
          className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
        >
```
New:
```tsx
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Orte</h2>
        <button
          onClick={onAddClick}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
        >
```

Old:
```tsx
          <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
            <MapPin ... />
            <p>Noch keine Orte vorhanden.</p>
            <button onClick={onAddClick} className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors">
```
New:
```tsx
          <div className={`col-span-2 text-center py-12 ${TEXT_MUTED}`}>
            <MapPin ... />
            <p>Noch keine Orte vorhanden.</p>
            <button onClick={onAddClick} className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}>
```
(Keep the `<MapPin ... />` icon element exactly as it is.)

- [ ] **Step 2: Update `PlaceCard.tsx`**

Old:
```tsx
import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Place } from './types'
```
New:
```tsx
import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Place } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT_TEXT, RADIUS, BADGE_RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'
```

Old:
```tsx
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white font-semibold flex-shrink-0">
```
New:
```tsx
    <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
```
(Same `card-hover` removal rationale as Task 4 Step 2.)

Old:
```tsx
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{place.name}</h4>
```
New:
```tsx
            <h4 className={`font-semibold ${TEXT_PRIMARY} truncate`}>{place.name}</h4>
```

Old:
```tsx
          {place.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{place.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {place.location && (
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                {place.location}
              </span>
            )}
            {place.importance && (
              <span className="text-xs px-2 py-1 bg-[#4A7C59]/10 text-[#4A7C59] rounded-full">
                {place.importance}
              </span>
            )}
          </div>
```
New:
```tsx
          {place.description && (
            <p className={`text-sm ${TEXT_SECONDARY} mt-1 line-clamp-2`}>{place.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {place.location && (
              <span className={`text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${BADGE_RADIUS} text-zinc-600 dark:text-zinc-400`}>
                {place.location}
              </span>
            )}
            {place.importance && (
              <span className={`text-xs px-2 py-1 bg-indigo-600/10 ${ACCENT_TEXT} ${BADGE_RADIUS}`}>
                {place.importance}
              </span>
            )}
          </div>
```

- [ ] **Step 3: Run full verification**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: `tsc` clean (only pre-existing baseline errors), all Jest suites green.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/PlacesView.tsx frontend/src/app/components/PlaceCard.tsx
git commit -m "feat: apply flat-design theme to places view and cards"
```

---

### Task 6: Notes — `NotesView`, `NoteCard`

**Files:**
- Modify: `frontend/src/app/components/NotesView.tsx`
- Modify: `frontend/src/app/components/NoteCard.tsx`

**Interfaces:**
- Consumes: `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, `ACCENT`, `RADIUS`, `BORDER`, `CARD_SHADOW` from `@/lib/theme` (Task 1).

- [ ] **Step 1: Update `NotesView.tsx`**

Old:
```tsx
import { Plus, StickyNote } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { Chapter, Note } from './types'
```
New:
```tsx
import { Plus, StickyNote } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { Chapter, Note } from './types'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'
```

Old:
```tsx
        <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Notizen</h2>
        <button
          onClick={onAddClick}
          disabled={!selectedChapter}
          className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
```
New:
```tsx
        <h2 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>Notizen</h2>
        <button
          onClick={onAddClick}
          disabled={!selectedChapter}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
```

Old (two empty-state wrappers — no-chapter-selected and no-notes):
```tsx
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <StickyNote ... />
          <p>Bitte wähle zuerst ein Kapitel aus, um Notizen anzuzeigen.</p>
        </div>
```
```tsx
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <StickyNote ... />
          <p>Noch keine Notizen für dieses Kapitel.</p>
          <p className="text-sm mt-2">Klicke auf &quot;Neue Notiz&quot; um eine zu erstellen.</p>
        </div>
```
New (apply to both wrappers):
```tsx
        <div className={`text-center py-12 ${TEXT_MUTED}`}>
```
(Only the outer wrapper's `className` changes in both blocks — the `<StickyNote ... />` icon and paragraph text stay as-is.)

- [ ] **Step 2: Update `NoteCard.tsx`**

Old:
```tsx
import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Note } from './types'
```
New:
```tsx
import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Note } from './types'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, RADIUS, BORDER, CARD_SHADOW, ACCENT } from '@/lib/theme'
```

Old (editing-mode wrapper):
```tsx
      <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 mb-2"
          placeholder="Titel..."
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[100px] bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#4A7C59]"
          placeholder="Notiz..."
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] text-sm"
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            Abbrechen
          </button>
        </div>
      </div>
```
New:
```tsx
      <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW}`}>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className={`w-full text-lg font-semibold bg-transparent border-none outline-none ${TEXT_PRIMARY} mb-2`}
          placeholder="Titel..."
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className={`w-full min-h-[100px] bg-transparent border border-zinc-300 dark:border-zinc-600 ${RADIUS} p-2 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-600`}
          placeholder="Notiz..."
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className={`px-3 py-1.5 ${ACCENT} text-white ${RADIUS} text-sm`}
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className={`px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 ${RADIUS} text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm`}
          >
            Abbrechen
          </button>
        </div>
      </div>
```

Old (display-mode wrapper):
```tsx
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{note.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-[#4A7C59] transition-colors"
            title="Bearbeiten"
          >
```
New:
```tsx
    <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-4 ${BORDER} ${CARD_SHADOW} group`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className={`font-semibold ${TEXT_PRIMARY}`}>{note.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Bearbeiten"
          >
```
(`ACCENT_TEXT` isn't used here — an arbitrary `hover:` prefix can't wrap a multi-class constant, so this button's hover color is written as literal classes instead. Same `card-hover` removal rationale as Task 4 Step 2 — both the editing-mode and display-mode wrappers above drop `card-hover` and `shadow-sm` in favor of `CARD_SHADOW`.)

Old:
```tsx
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{note.content}</p>
      <p className="text-xs text-gray-400 mt-2">
        {new Date(note.updatedAt).toLocaleDateString('de-DE')}
      </p>
```
New:
```tsx
      <p className={`text-sm ${TEXT_SECONDARY} line-clamp-3`}>{note.content}</p>
      <p className={`text-xs ${TEXT_MUTED} mt-2`}>
        {new Date(note.updatedAt).toLocaleDateString('de-DE')}
      </p>
```

- [ ] **Step 3: Run full verification**

Run: `cd frontend && npx tsc --noEmit && npx jest`
Expected: `tsc` clean (only pre-existing baseline errors), all Jest suites green.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/NotesView.tsx frontend/src/app/components/NoteCard.tsx
git commit -m "feat: apply flat-design theme to notes view and cards"
```

---

## Final check (after Task 6)

- [ ] Run `cd frontend && npm run build` once at the end of the whole sub-project — confirms production build (not just `tsc --noEmit`) succeeds with all the new `theme.ts` imports across 13 files.
- [ ] Grep for any remaining stragglers before declaring done: `grep -rE "rounded-(lg|xl|2xl|full)|shadow-(sm|md|lg|xl)|#4A7C59|#6B9E7C|backdrop-blur" frontend/src/app/components/{LeftSidebar,RightSidebar,ChapterItem,ThemeToggle,ManuscriptView,RichTextEditor,WordProgress,DraftRecoveryBanner,CharactersView,CharacterCard,CharacterListItem,CharacterQuickCard,PlacesView,PlaceCard,NotesView,NoteCard}.tsx` — expect no matches (any hit means a step above missed an occurrence).
