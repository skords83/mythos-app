# Flat-Design-Refactor für Modals, Dashboard und Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the remaining pre-flat-design UI surfaces (modals, dashboard, login) onto the centralized `frontend/src/lib/theme.ts` token system already used by the editor core, eliminating soft rounding, soft shadows, glassmorphism, gradients and the old `#4A7C59` green accent.

**Architecture:** Pure styling refactor, no component boundaries, state, or API calls change. Four new tokens (`OVERLAY`, `MODAL_PANEL`, `INPUT`, `BUTTON_SECONDARY`) are added to `theme.ts`; every target file swaps its inline Tailwind strings for these tokens plus the existing tokens (`ACCENT`, `ACCENT_TEXT`, `RADIUS`, `BADGE_RADIUS`, `BORDER`, `CARD_SHADOW`, `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, `HOVER_SURFACE`).

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Jest, TypeScript.

## Global Constraints

- Semantic status colors (error/success/danger — red banners, red Toast, red danger button in `ConfirmDialog`) stay red/green. Only hard-edge/no-gradient/no-soft-shadow normalization applies to them, never a hue change.
- No new primitive components. Reuse the existing `theme.ts` constant pattern exactly as the editor core does.
- `rounded-full` is eliminated too, matching editor-core precedent (verified: no `rounded-full` survives anywhere in already-migrated editor-core files) — even circular badges/avatars become `RADIUS` (`rounded-none`).
- The outermost `min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]` page-background wrapper is **left untouched** everywhere (dashboard loading state, dashboard main wrapper, login page wrapper) — this exact wrapper is still untouched in the already-"complete" editor-core `page.tsx` (verified at `frontend/src/app/page.tsx:133,141,176`), so touching it here would be inconsistent with established precedent and out of this sub-project's explicit scope.
- `frontend/src/app/globals.css`'s `:root` CSS custom properties (`--accent`, `--bg-paper`, etc.) are **not** touched — out of scope per the design spec, which only calls for removing the `.card-hover` rule.
- `tsc --noEmit` and the full Jest suite must stay green after every task. No Docker/Postgres in this sandbox — no live browser test here; real visual sign-off happens in the user's environment via `next dev`.

---

### Task 1: theme.ts — add OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY

**Files:**
- Modify: `frontend/src/lib/theme.ts`
- Modify: `frontend/src/lib/__tests__/theme.test.ts`

**Interfaces:**
- Produces: `OVERLAY`, `MODAL_PANEL`, `INPUT`, `BUTTON_SECONDARY` string constants, consumed by every later task.

- [ ] **Step 1: Add the four new tokens to theme.ts**

Append after the existing `DIVIDER` line (`frontend/src/lib/theme.ts:20`):

```ts
export const OVERLAY = 'fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 animate-fade-in'
export const MODAL_PANEL = 'bg-stone-50 dark:bg-zinc-900 rounded-none shadow-[4px_4px_0_0_#18181b] border border-zinc-900 dark:border-zinc-700'
export const INPUT = 'w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-none bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-600 outline-none'
export const BUTTON_SECONDARY = 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
```

- [ ] **Step 2: Add a token-correctness test**

Add to `frontend/src/lib/__tests__/theme.test.ts`, before the final closing `})`:

```ts
  it('modal/overlay tokens are flat — no blur, no gradient, no old green', () => {
    expect(theme.OVERLAY).not.toContain('blur')
    expect(theme.MODAL_PANEL).not.toContain('4A7C59')
    expect(theme.INPUT).not.toContain('4A7C59')
    expect(theme.BUTTON_SECONDARY).not.toContain('4A7C59')
  })
```

- [ ] **Step 3: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test -- theme.test.ts
```

Expected: both pass, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/theme.ts frontend/src/lib/__tests__/theme.test.ts
git commit -m "feat: add OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY theme tokens"
```

---

### Task 2: ConfirmDialog + Toast

**Files:**
- Modify: `frontend/src/app/components/ConfirmDialog.tsx`
- Modify: `frontend/src/app/components/Toast.tsx`

**Interfaces:**
- Consumes: `MODAL_PANEL, RADIUS, BUTTON_SECONDARY, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY` (ConfirmDialog); `RADIUS, CARD_SHADOW` (Toast) from `frontend/src/lib/theme.ts` (Task 1).

**Implementation note:** `ConfirmDialog` needs `z-[60]` (must stack above modals at `z-50`) — it does **not** use the `OVERLAY` token verbatim (which bakes in `z-50`); only its `bg-black/50 backdrop-blur-sm` fragment is replaced with the flat `bg-zinc-950/60`, all other classes (`z-[60]`, layout) stay as-is.

- [ ] **Step 1: ConfirmDialog.tsx — add theme import**

Old:
```tsx
import { AlertTriangle } from 'lucide-react'
```
New:
```tsx
import { AlertTriangle } from 'lucide-react'
import { MODAL_PANEL, RADIUS, BUTTON_SECONDARY, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
```

- [ ] **Step 2: ConfirmDialog.tsx — overlay, panel, text, buttons**

Old:
```tsx
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-sm">
```
New:
```tsx
    <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-[60] animate-fade-in">
      <div className={`${MODAL_PANEL} p-6 w-full max-w-sm`}>
```

Old:
```tsx
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
```
New:
```tsx
            <h2 className={`text-lg font-serif font-bold ${TEXT_PRIMARY}`}>
              {title}
            </h2>
            <p className={`text-sm ${TEXT_SECONDARY} mt-1`}>
```

Old:
```tsx
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4A7C59] hover:bg-[#3d6349]'
            }`}
          >
```
New:
```tsx
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${RADIUS} text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : ACCENT
            }`}
          >
```

- [ ] **Step 3: Toast.tsx — add theme import and apply tokens**

Old:
```tsx
import { AlertCircle, X } from 'lucide-react'
```
New:
```tsx
import { AlertCircle, X } from 'lucide-react'
import { RADIUS, CARD_SHADOW } from '@/lib/theme'
```

Old:
```tsx
      <div className="flex items-center gap-3 bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 max-w-md">
```
New:
```tsx
      <div className={`flex items-center gap-3 bg-red-600 text-white ${RADIUS} ${CARD_SHADOW} px-4 py-3 max-w-md`}>
```

(`bg-red-600` is the semantic error color — stays.)

- [ ] **Step 4: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/ConfirmDialog.tsx frontend/src/app/components/Toast.tsx
git commit -m "feat: apply flat-design theme to ConfirmDialog and Toast"
```

---

### Task 3: Add-modals — CreateProjectModal, AddCharacterModal, AddPlaceModal

**Files:**
- Modify: `frontend/src/app/components/CreateProjectModal.tsx`
- Modify: `frontend/src/app/components/AddCharacterModal.tsx`
- Modify: `frontend/src/app/components/AddPlaceModal.tsx`

**Interfaces:**
- Consumes: `OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY` from `frontend/src/lib/theme.ts` (Task 1).

All three files share byte-identical fragments for overlay/panel/title/label/input/select/buttons — apply the same substitutions to each file.

- [ ] **Step 1: CreateProjectModal.tsx**

Add import after `import React, { useState } from 'react'`:
```tsx
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
```

Old:
```tsx
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-900 dark:text-gray-100">
```
New:
```tsx
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
```

Replace all 3 occurrences (`replace_all: true`) of:
```
block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1
```
with:
```
block text-sm font-medium ${TEXT_SECONDARY} mb-1
```
(and switch the surrounding `className="..."` to `className={\`...\`}` at each of the 3 label sites — for `title`, `description`, `wordGoal`).

Replace both occurrences (`replace_all: true`) of the input/number-input class:
```
w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none
```
with `className={INPUT}`.

Replace the textarea class:
```
w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none resize-none
```
with `className={\`${INPUT} resize-none\`}`.

Old:
```tsx
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Erstellen
```
New:
```tsx
              className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
            >
              Erstellen
```

- [ ] **Step 2: AddCharacterModal.tsx**

Same import line and same mechanical substitutions as Step 1, applied to this file's 4 field labels (Name, Beschreibung, Motivation, Sichtbarkeit) and 4 input/textarea/select class occurrences (identical base strings — text input, textarea `+resize-none`, and the `<select>` uses the exact same base string as the plain inputs, so it's covered by the same `replace_all`). Button block identical pattern, submit label is "Hinzufügen" instead of "Erstellen":

Old:
```tsx
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Hinzufügen
```
New:
```tsx
              className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
            >
              Hinzufügen
```

Overlay/panel/title substitutions identical to Step 1 ("Neuer Charakter" title text unchanged).

- [ ] **Step 3: AddPlaceModal.tsx**

Same import line and same mechanical substitutions, applied to this file's 6 field labels (Name, Beschreibung, Standort, Klima, Bedeutung, Sichtbarkeit) and 6 input/textarea/select class occurrences (identical base strings — same `replace_all` pattern as Step 1/2). Overlay/panel/title substitutions identical ("Neuer Ort" title text unchanged). Button block identical to Step 2 (submit label "Hinzufügen").

- [ ] **Step 4: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/CreateProjectModal.tsx frontend/src/app/components/AddCharacterModal.tsx frontend/src/app/components/AddPlaceModal.tsx
git commit -m "feat: apply flat-design theme to CreateProjectModal, AddCharacterModal, AddPlaceModal"
```

---

### Task 4: Edit-modals — EditCharacterModal, EditProjectModal

**Files:**
- Modify: `frontend/src/app/components/EditCharacterModal.tsx`
- Modify: `frontend/src/app/components/EditProjectModal.tsx`

**Interfaces:**
- Consumes: `OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, BADGE_RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED` from `frontend/src/lib/theme.ts` (Task 1).

- [ ] **Step 1: EditCharacterModal.tsx**

Add import after `import { Character } from './types'`:
```tsx
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
```

Apply the identical overlay/panel/title/label/input/textarea/select/button substitutions as Task 3 Step 1 (4 labels: Name, Beschreibung, Motivation, Sichtbarkeit; 4 input/textarea/select occurrences; submit label "Speichern" instead of "Erstellen"; title text "Charakter bearbeiten" unchanged):

Old:
```tsx
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Speichern
```
New:
```tsx
              className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
            >
              Speichern
```

- [ ] **Step 2: EditProjectModal.tsx — imports and overlay/panel**

Add import after `import { Project } from './types'`:
```tsx
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, BADGE_RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
```

Old:
```tsx
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Projekteinstellungen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
```
New:
```tsx
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} w-full max-w-md overflow-hidden`}>
        <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700 flex items-center justify-between">
          <h2 className={`text-xl font-serif font-bold ${TEXT_PRIMARY}`}>
            Projekteinstellungen
          </h2>
          <button
            onClick={onClose}
            className={`${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors`}
          >
```

- [ ] **Step 3: EditProjectModal.tsx — tabs**

Old:
```tsx
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-[#4A7C59] border-b-2 border-[#4A7C59]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Allgemein
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'danger'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
```
New:
```tsx
        <div className="flex border-b border-zinc-300 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Allgemein
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'danger'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
```

(danger tab's active red state is semantic — unchanged.)

- [ ] **Step 4: EditProjectModal.tsx — general-tab form fields**

Replace all 4 occurrences (`replace_all: true`, Projekttitel/Beschreibung/Titelbild/Tagesziel labels) of:
```
block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1
```
with:
```
block text-sm font-medium ${TEXT_SECONDARY} mb-1
```

Replace both occurrences (`replace_all: true`, title-input and wordGoal-input) of:
```
w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none
```
with `className={INPUT}`.

Replace the description-textarea class:
```
w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none resize-none
```
with `className={\`${INPUT} resize-none\`}`.

- [ ] **Step 5: EditProjectModal.tsx — cover image block**

Old:
```tsx
                    <div className="relative">
                      <img src={coverImage} alt="Cover" className="w-16 h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
                      <span className="text-xs">Keins</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
```
New:
```tsx
                    <div className="relative">
                      <img src={coverImage} alt="Cover" className={`w-16 h-20 object-cover ${RADIUS}`} />
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className={`absolute -top-2 -right-2 bg-red-500 text-white ${RADIUS} p-0.5`}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={`w-16 h-20 bg-zinc-200 dark:bg-zinc-700 ${RADIUS} flex items-center justify-center ${TEXT_MUTED}`}>
                      <span className="text-xs">Keins</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className={`px-3 py-2 ${BUTTON_SECONDARY} text-sm ${RADIUS}`}
                  >
```

- [ ] **Step 6: EditProjectModal.tsx — wordGoal helper text and general-tab buttons**

Old:
```tsx
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Aktuell: {project.wordGoal} Wörter
                </p>
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
```
New:
```tsx
                <p className={`text-xs ${TEXT_MUTED} mt-1`}>
                  Aktuell: {project.wordGoal} Wörter
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
                >
                  Speichern
```

- [ ] **Step 7: EditProjectModal.tsx — danger zone**

Old:
```tsx
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
```
New:
```tsx
                  <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${RADIUS} p-4`}>
```

Old:
```tsx
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
```
New:
```tsx
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className={`w-full px-4 py-2 bg-red-500 text-white ${RADIUS} hover:bg-red-600 transition-colors flex items-center justify-center gap-2`}
                  >
```

Old:
```tsx
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-4">
```
New:
```tsx
                <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${RADIUS} p-4 space-y-4`}>
```

Replace both occurrences (`replace_all: true`, the confirm-zone Abbrechen and the earlier general-tab Abbrechen were already handled in Step 6 — this is only the confirm-zone Abbrechen, single occurrence remaining) of:
```
flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
```
with `className={\`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}\`}`.

Old:
```tsx
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
```
New:
```tsx
                    <button
                      onClick={handleDelete}
                      className={`flex-1 px-4 py-2 bg-red-500 text-white ${RADIUS} hover:bg-red-600 transition-colors`}
                    >
```

`AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20}` and `<Trash2 size={18} />` are unchanged (no old-palette classes).

- [ ] **Step 8: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/components/EditCharacterModal.tsx frontend/src/app/components/EditProjectModal.tsx
git commit -m "feat: apply flat-design theme to EditCharacterModal and EditProjectModal"
```

---

### Task 5: ExportModal

**Files:**
- Modify: `frontend/src/app/components/ExportModal.tsx`

**Interfaces:**
- Consumes: `OVERLAY, MODAL_PANEL, ACCENT, RADIUS, BUTTON_SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED` from `frontend/src/lib/theme.ts` (Task 1).

- [ ] **Step 1: Add import and overlay/panel/title/close-button**

Add import after `import { stripHtml } from '@/lib/text'`:
```tsx
import { OVERLAY, MODAL_PANEL, ACCENT, RADIUS, BUTTON_SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
```

Old:
```tsx
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Exportieren
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
```
New:
```tsx
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-serif font-bold ${TEXT_PRIMARY}`}>
            Exportieren
          </h2>
          <button onClick={onClose} className={`${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300`}>
```

- [ ] **Step 2: Labels and toggle buttons**

Replace both occurrences (`replace_all: true`) of:
```
block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2
```
with:
```
block text-sm font-medium ${TEXT_SECONDARY} mb-2
```

Replace both occurrences (`replace_all: true`, export-type toggle base wrapper) of:
```
flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors
```
with:
```
flex-1 flex items-center justify-center gap-2 px-4 py-2 ${RADIUS} border transition-colors
```

Replace all 4 occurrences (`replace_all: true`, appears in both export-type and format toggles) of:
```
bg-[#4A7C59] text-white border-[#4A7C59]
```
with:
```
${ACCENT} text-white border-indigo-600
```

Replace both occurrences (`replace_all: true`, export-type toggle inactive state) of:
```
border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
```
with:
```
${BUTTON_SECONDARY}
```
(`BUTTON_SECONDARY` already ends in `transition-colors`, duplicating the template's own `transition-colors` — harmless.)

Replace both occurrences (`replace_all: true`, format toggle base wrapper) of:
```
flex-1 px-4 py-2 rounded-lg border transition-colors
```
with:
```
flex-1 px-4 py-2 ${RADIUS} border transition-colors
```

Replace both occurrences (`replace_all: true`, format toggle inactive state) of:
```
border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
```
with:
```
border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300
```

- [ ] **Step 3: Download button**

Old:
```tsx
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors disabled:opacity-50"
```
New:
```tsx
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 ${ACCENT} text-white ${RADIUS} transition-colors disabled:opacity-50`}
```

`exportError` text (`text-sm text-red-600 dark:text-red-400`) is semantic — unchanged. The `X`, `Book`, `FileText`, `Download` icons carry no color classes — unchanged.

- [ ] **Step 4: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/ExportModal.tsx
git commit -m "feat: apply flat-design theme to ExportModal"
```

---

### Task 6: SearchModal

**Files:**
- Modify: `frontend/src/app/components/SearchModal.tsx`

**Interfaces:**
- Consumes: `MODAL_PANEL, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED` from `frontend/src/lib/theme.ts` (Task 1).

**Implementation note:** the overlay is `items-start justify-center pt-24` (search sits near the top), not `items-center` like `OVERLAY` — same rule as `ConfirmDialog` in Task 2: only the `bg-black/50 backdrop-blur-sm` fragment is flattened, the rest of the layout classes are kept as-is (`OVERLAY` is not used verbatim).

- [ ] **Step 1: Add import, overlay, panel, search bar**

Add import after `import { SearchResultItem, SearchResults } from '../hooks/useSearch'`:
```tsx
import { MODAL_PANEL, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
```

Old:
```tsx
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#262626] rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search size={20} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in Kapiteln, Charakteren, Orten, Notizen..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
```
New:
```tsx
    <div className="fixed inset-0 bg-zinc-950/60 flex items-start justify-center pt-24 z-50 animate-fade-in" onClick={onClose}>
      <div
        className={`${MODAL_PANEL} w-full max-w-lg max-h-[70vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-zinc-300 dark:border-zinc-700">
          <Search size={20} className={`${TEXT_MUTED} flex-shrink-0`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in Kapiteln, Charakteren, Orten, Notizen..."
            className={`flex-1 bg-transparent outline-none ${TEXT_PRIMARY} placeholder-zinc-400`}
          />
          <button onClick={onClose} className={`${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0`}>
```

- [ ] **Step 2: Empty/loading/no-results states and section label**

Replace all 3 occurrences (`replace_all: true`) of:
```
text-center text-sm text-gray-400 py-8
```
with:
```
text-center text-sm ${TEXT_MUTED} py-8
```

Old:
```tsx
                <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
```
New:
```tsx
                <div className={`px-2 py-1 text-xs font-medium ${TEXT_MUTED} uppercase tracking-wide`}>
```

- [ ] **Step 3: Result item button and content**

Old:
```tsx
                    className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                  >
                    <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </div>
                      {item.snippet && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
```
New:
```tsx
                    className={`w-full flex items-start gap-3 px-2 py-2 ${RADIUS} hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors`}
                  >
                    <Icon size={16} className={`${TEXT_MUTED} mt-0.5 flex-shrink-0`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${TEXT_PRIMARY} truncate`}>
                        {item.title}
                      </div>
                      {item.snippet && (
                        <div className={`text-xs ${TEXT_MUTED} line-clamp-2`}>
```

- [ ] **Step 4: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/SearchModal.tsx
git commit -m "feat: apply flat-design theme to SearchModal"
```

---

### Task 7: Dashboard — delete orphaned ProjectCard.tsx, migrate inline ProjectCard() and DashboardPage()

**Files:**
- Delete: `frontend/src/app/components/ProjectCard.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, ACCENT_TEXT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, BORDER, CARD_SHADOW, HOVER_SURFACE` from `frontend/src/lib/theme.ts` (Task 1 + existing tokens).

**Implementation note (user-confirmed):** `frontend/src/app/components/ProjectCard.tsx` is dead code — grep confirms it is never imported anywhere (`grep -rn "ProjectCard" frontend/src/app` only shows its own `export` line and unrelated hits in `dashboard/page.tsx`, which defines and uses its **own** inline `ProjectCard()` function). Delete the orphaned file rather than migrate it.

- [ ] **Step 1: Delete the orphaned file**

```bash
git rm frontend/src/app/components/ProjectCard.tsx
```

- [ ] **Step 2: dashboard/page.tsx — add theme import**

Add import after `import { Toast } from '../components/Toast'`:
```tsx
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, ACCENT_TEXT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, BORDER, CARD_SHADOW, HOVER_SURFACE } from '@/lib/theme'
```

- [ ] **Step 3: inline ThemeToggle()**

Old:
```tsx
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
```
New:
```tsx
      className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
```

(`Sun`/`Moon` icons unchanged.)

- [ ] **Step 4: inline CreateProjectModal()**

Apply the identical substitutions as Task 3 Step 1 to this file's local `CreateProjectModal` function (lines ~86-149): overlay → `OVERLAY`, panel → `` `${MODAL_PANEL} p-6 w-full max-w-md` ``, title → `TEXT_PRIMARY`, 3 labels → `replace_all` to `TEXT_SECONDARY`, 2 identical input occurrences (title, wordGoal) → `replace_all` to `INPUT`, textarea → `` `${INPUT} resize-none` ``, Abbrechen button → `` `flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}` ``, Erstellen button → `` `flex-1 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors` ``.

- [ ] **Step 5: inline ProjectCard() — card shell and delete button**

Old:
```tsx
    <div className="bg-white dark:bg-[#262626] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white">
          <Book size={24} />
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Projekt löschen"
        >
```
New:
```tsx
    <div className={`bg-white dark:bg-zinc-900 ${RADIUS} p-6 ${BORDER} ${CARD_SHADOW} group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${RADIUS} bg-indigo-600 flex items-center justify-center text-white`}>
          <Book size={24} />
        </div>
        <button
          onClick={onDelete}
          className={`p-2 ${TEXT_MUTED} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
          title="Projekt löschen"
        >
```

(dropping `hover:shadow-md transition-shadow` — no hover elevation, matching the `PlaceCard` precedent in `frontend/src/app/components/PlaceCard.tsx`, which uses `${CARD_SHADOW}` statically with no hover shadow.)

- [ ] **Step 6: inline ProjectCard() — text, stats, open button**

Old:
```tsx
      <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
        {project.title}
      </h3>
      
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
```
New:
```tsx
      <h3 className={`text-xl font-serif font-bold ${TEXT_PRIMARY} mb-2`}>
        {project.title}
      </h3>
      
      {project.description && (
        <p className={`text-sm ${TEXT_SECONDARY} mb-4 line-clamp-2`}>
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className={`flex items-center gap-4 mb-4 text-sm ${TEXT_MUTED}`}>
```

Old:
```tsx
      <button
        onClick={onOpen}
        className="w-full py-2 px-4 bg-[#4A7C59]/10 hover:bg-[#4A7C59]/20 text-[#4A7C59] rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
      >
```
New:
```tsx
      <button
        onClick={onOpen}
        className={`w-full py-2 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 ${ACCENT_TEXT} ${RADIUS} transition-colors flex items-center justify-center gap-2 font-medium`}
      >
```

- [ ] **Step 7: DashboardPage() — loading spinner and header bar**

Old:
```tsx
        <Loader2 size={32} className="animate-spin text-[#4A7C59]" />
```
New:
```tsx
        <Loader2 size={32} className={`animate-spin ${ACCENT_TEXT}`} />
```

(the surrounding `min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]` wrapper stays untouched — see Global Constraints.)

Old:
```tsx
      <header className="bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
```
New:
```tsx
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 sticky top-0 z-40">
```

- [ ] **Step 8: DashboardPage() — logo, user info, nav buttons**

Old:
```tsx
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center">
                <Book size={20} className="text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100">
```
New:
```tsx
              <div className={`w-10 h-10 ${RADIUS} bg-indigo-600 flex items-center justify-center`}>
                <Book size={20} className="text-white" />
              </div>
              <span className={`text-xl font-serif font-bold ${TEXT_PRIMARY}`}>
```

Old:
```tsx
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
```
New:
```tsx
                <span className={`text-sm ${TEXT_SECONDARY} hidden sm:block`}>
```

Replace both occurrences (`replace_all: true`, Familie and Abmelden buttons) of:
```
p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400
```
with:
```
p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}
```

(`Book`, `Users`, `LogOut` icons carry no separate color classes beyond what's inherited — unchanged.)

- [ ] **Step 9: DashboardPage() — page header, empty state, CTA buttons**

Old:
```tsx
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
              Deine Projekte
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
          >
```
New:
```tsx
            <h1 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY} mb-2`}>
              Deine Projekte
            </h1>
            <p className={TEXT_MUTED}>
              {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2`}
          >
```

Old:
```tsx
            <Book size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-serif text-gray-700 dark:text-gray-300 mb-2">
              Noch keine Projekte
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Erstelle dein erstes Projekt und beginne mit deinem nächsten Meisterwerk.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors inline-flex items-center gap-2"
            >
```
New:
```tsx
            <Book size={64} className={`mx-auto ${TEXT_MUTED} mb-4`} />
            <h2 className={`text-xl font-serif ${TEXT_SECONDARY} mb-2`}>
              Noch keine Projekte
            </h2>
            <p className={`${TEXT_MUTED} mb-6 max-w-md mx-auto`}>
              Erstelle dein erstes Projekt und beginne mit deinem nächsten Meisterwerk.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`px-6 py-3 ${ACCENT} text-white ${RADIUS} transition-colors inline-flex items-center gap-2`}
            >
```

(`Plus` icons unchanged.)

- [ ] **Step 10: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 11: Commit**

```bash
git add -A frontend/src/app/dashboard/page.tsx frontend/src/app/components/ProjectCard.tsx
git commit -m "feat: apply flat-design theme to dashboard; remove orphaned ProjectCard.tsx"
```

---

### Task 8: login/page.tsx

**Files:**
- Modify: `frontend/src/app/login/page.tsx`

**Interfaces:**
- Consumes: `MODAL_PANEL, INPUT, ACCENT, ACCENT_TEXT, RADIUS, CARD_SHADOW, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED` from `frontend/src/lib/theme.ts` (Task 1 + existing tokens).

**Implementation note:** the spec explicitly includes login in `INPUT`'s scope ("`INPUT` ersetzt alle Formularfeld-Styles ... in Modals und Login"), so the login inputs adopt the modal `INPUT` token verbatim (dropping their previously-larger `px-4 py-3`/`rounded-xl` sizing in favor of the unified `px-3 py-2`/`rounded-none`). The login card reuses `MODAL_PANEL` since it's the same flat elevated-panel treatment. The outer `min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]` wrapper stays untouched (see Global Constraints).

- [ ] **Step 1: Add import, icon block, headings**

Add import after `import { useRouter } from 'next/navigation'`:
```tsx
import { MODAL_PANEL, INPUT, ACCENT, ACCENT_TEXT, RADIUS, CARD_SHADOW, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
```

Old:
```tsx
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] mb-4 shadow-lg">
            <Book size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
            Mythos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
```
New:
```tsx
          <div className={`inline-flex items-center justify-center w-16 h-16 ${RADIUS} bg-indigo-600 mb-4 ${CARD_SHADOW}`}>
            <Book size={32} className="text-white" />
          </div>
          <h1 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY} mb-2`}>
            Mythos
          </h1>
          <p className={TEXT_MUTED}>
```

- [ ] **Step 2: Card panel and heading**

Old:
```tsx
        <div className="bg-white dark:bg-[#262626] rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
```
New:
```tsx
        <div className={`${MODAL_PANEL} p-8`}>
          <h2 className={`text-xl font-semibold ${TEXT_PRIMARY} mb-6`}>
```

- [ ] **Step 3: Labels and inputs**

Replace all 3 occurrences (`replace_all: true`, Name/E-Mail/Passwort labels) of:
```
block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2
```
with:
```
block text-sm font-medium ${TEXT_SECONDARY} mb-2
```

Old (Name input):
```tsx
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] focus:border-transparent outline-none transition-all"
                  placeholder="Dein Name"
```
New:
```tsx
                  className={INPUT}
                  placeholder="Dein Name"
```

Old (E-Mail input):
```tsx
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] focus:border-transparent outline-none transition-all"
                placeholder="deine@email.de"
```
New:
```tsx
                className={INPUT}
                placeholder="deine@email.de"
```

Old (Password input):
```tsx
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] focus:border-transparent outline-none transition-all pr-12"
```
New:
```tsx
                  className={`${INPUT} pr-12`}
```

- [ ] **Step 4: Password toggle, error box, submit button**

Old:
```tsx
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
```
New:
```tsx
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300`}
```

Old:
```tsx
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
```
New:
```tsx
              <div className={`p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${RADIUS}`}>
```

Old:
```tsx
              className="w-full py-3 px-4 bg-[#4A7C59] hover:bg-[#3d6349] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
```
New:
```tsx
              className={`w-full py-3 px-4 ${ACCENT} text-white font-medium ${RADIUS} transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
```

- [ ] **Step 5: Footer divider, toggle text, toggle link**

Old:
```tsx
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
```
New:
```tsx
          <div className="mt-6 pt-6 border-t border-zinc-300 dark:border-zinc-700">
            <p className={`text-sm ${TEXT_MUTED} text-center`}>
```

Old:
```tsx
                className="ml-1 text-[#4A7C59] hover:underline font-medium"
```
New:
```tsx
                className={`ml-1 ${ACCENT_TEXT} hover:underline font-medium`}
```

Old:
```tsx
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
```
New:
```tsx
        <p className={`text-center text-sm ${TEXT_MUTED} mt-8`}>
```

(`Eye`/`EyeOff`/`Loader2`/`LogIn`/`UserPlus` icons unchanged — no old-palette classes.)

- [ ] **Step 6: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat: apply flat-design theme to login page"
```

---

### Task 9: globals.css — remove orphaned .card-hover rule

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Confirm no remaining references**

```bash
grep -rn "card-hover" frontend/src/
```

Expected: no output (Task 7 already deleted the only file that referenced it, `components/ProjectCard.tsx`).

- [ ] **Step 2: Remove the rule**

Old:
```css
/* Transitions */
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Scrollbar styling */
```
New:
```css
/* Scrollbar styling */
```

(`:root` CSS custom properties are untouched — out of scope, see Global Constraints.)

- [ ] **Step 3: Verify**

```bash
cd frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "chore: remove orphaned .card-hover rule from globals.css"
```

---

## Self-Review Notes

- **Spec coverage:** all 12 explicitly-scoped files (`AddCharacterModal`, `EditCharacterModal`, `AddPlaceModal`, `EditProjectModal`, `CreateProjectModal`, `ExportModal`, `SearchModal`, `ConfirmDialog`, `Toast`, `ProjectCard` (found to be the inline dashboard function, not the dead file), `dashboard/page.tsx`, `login/page.tsx`) are covered across Tasks 2–8, plus `globals.css` cleanup in Task 9 and the 4 new tokens in Task 1 — matches the spec's decision table and sequencing exactly, with one user-approved deviation (deleting dead `components/ProjectCard.tsx` instead of migrating it, discovered during planning).
- **Placeholder scan:** every step shows literal old/new code drawn from the verified current file contents — no "TBD"/"similar to Task N"/unshown code.
- **Type consistency:** token names (`OVERLAY`, `MODAL_PANEL`, `INPUT`, `BUTTON_SECONDARY`, plus existing `ACCENT`, `ACCENT_TEXT`, `RADIUS`, `BADGE_RADIUS`, `BORDER`, `CARD_SHADOW`, `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, `HOVER_SURFACE`) are used identically across every task that consumes them.
