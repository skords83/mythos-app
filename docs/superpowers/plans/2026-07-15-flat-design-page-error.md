# Flat-Design Migration: Root Editor Page & Error Boundary

## Context

The flat-design token migration (Neo-Brutalism / High-Contrast-Flat, `frontend/src/lib/theme.ts`) has already been applied to:
- the editor-core components (Sub-Project 2, 2026-07-13/14)
- all 7 modals, ConfirmDialog, Toast, the dashboard page, and the login page (Sub-Project, 2026-07-14)

A follow-up audit (2026-07-15) found two files that were never in scope for either round and still use the pre-flat-design palette end-to-end:

- `frontend/src/app/page.tsx` — the root editor route (`/`). Loading state, the "no project" empty state, and the sticky editor header (Save button, tab titles, word count) all use the old off-white/near-black hex backgrounds, the old brand green (`#4A7C59`/`#3d6349`), `rounded-lg`, and `text-gray-*`.
- `frontend/src/app/error.tsx` — the global Next.js error boundary. Uses `rounded-lg shadow`, `bg-blue-600`, and `text-gray-*`.

## Explicit Out-of-Scope Decision

`docs/superpowers/plans/2026-07-14-flat-design-modals-dashboard-login.md` deliberately left the outermost `min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]` page-background wrapper untouched in every file it migrated (login, dashboard) — the `SURFACE` token exists in `theme.ts` but is only actually applied in `RichTextEditor.tsx`. This plan **continues that precedent**: the outermost root-level `min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]` wrapper divs in both `page.tsx` and `error.tsx` stay byte-for-byte unchanged. Do not touch them, and do not import `SURFACE` for them. (Fixing the root background everywhere it appears — including the two files that were already marked "done" — is tracked separately in the project backlog as a follow-up; it is not part of this plan.)

## Global Constraints

- Import tokens from `@/lib/theme` (or relative `../lib/theme` per existing import style in the target file) — never hardcode the hex/gray values being replaced.
- `RADIUS = 'rounded-none'` replaces every `rounded-lg`/`rounded` on buttons and panels in scope.
- `ACCENT = 'bg-indigo-600 hover:bg-indigo-700'` replaces every old-brand-color button (`bg-[#4A7C59]`/`hover:bg-[#3d6349]` in page.tsx, `bg-blue-600`/`hover:bg-blue-700` in error.tsx).
- `TEXT_PRIMARY = 'text-zinc-900 dark:text-zinc-200'` for headings that carry primary visual weight (matches how `login/page.tsx` treats its `h1`/card `h2`).
- `TEXT_MUTED = 'text-zinc-400 dark:text-zinc-500'` for de-emphasized helper/status text (matches how `login/page.tsx` treats its subtitle/footer: `gray-500`/`gray-400` → `TEXT_MUTED`, not `TEXT_SECONDARY`).
- `MODAL_PANEL = 'bg-stone-50 dark:bg-zinc-900 rounded-none shadow-[4px_4px_0_0_#18181b] border border-zinc-900 dark:border-zinc-700'` replaces any `bg-white dark:bg-[#262626] rounded-lg shadow` card panel — this is exactly what `error.tsx`'s card is.
- No `backdrop-blur`/translucent (`/50`, `/60`) surfaces — the establish Neo-Brutalism rule (flagged as an Important finding in Sub-Project 2's Task 2 review) is hard, solid surfaces only. Where `page.tsx`'s header bar currently uses `bg-white/50 dark:bg-[#262626]/50 backdrop-blur-sm`, replace with the solid `SURFACE_ALT` token; replace `border-b border-gray-200 dark:border-gray-700` with `border-b border-zinc-300 dark:border-zinc-700` (same color pair as the `BORDER` token, but `border-b` only — `BORDER` itself sets all four sides so cannot be used verbatim here).
- Error/danger-colored elements (red-50/red-900/red-200/red-800/red-600/red-400 validation banners) are **not** tokenized anywhere in the existing migrated code (see `login/page.tsx`'s error banner) — leave any such colors as-is if encountered; there are none in these two files' current state, so this should not come up, but do not invent a `theme.ts` export for it if it does.
- Keep every non-color Tailwind utility (spacing, flex, font-serif, font-weight, text sizing) exactly as-is. This is a color/radius/shadow/border token swap, not a layout change.
- No new components, no behavior changes, no prop changes. Pure className substitution.

## Task 1: `frontend/src/app/page.tsx`

Migrate every in-scope color/radius/border class in this file to the design tokens. Read the current file first — do not work from memory of it.

Exact mappings (root wrappers on the three `min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]...` divs are OUT OF SCOPE, see above — leave those three `className` strings' background exactly as they are, only touch classes on elements *inside* them):

1. **Loading state** (`Laden...` div): `text-gray-500 dark:text-gray-400` → `TEXT_MUTED`.
2. **Empty state** (`!selectedProject` branch):
   - `<h1>Mythos</h1>`: `text-gray-900 dark:text-gray-100` → `TEXT_PRIMARY` (keep `text-3xl font-serif font-bold`).
   - `<h2>Willkommen bei Mythos</h2>`: `text-gray-700 dark:text-gray-300` → `TEXT_PRIMARY` (keep `text-2xl font-serif mb-2`) — this is the dominant heading of the empty state, same visual role as login's card `h2`.
   - `<p>Erstelle dein erstes Projekt...</p>`: `text-gray-500 dark:text-gray-400` → `TEXT_MUTED`.
   - `<button>Neues Projekt erstellen</button>`: `bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349]` → `${ACCENT} text-white ${RADIUS}` (keep `transition-colors flex items-center gap-2 mx-auto`).
3. **Editor header bar** (`<header className="h-16 bg-white/50 ...">`):
   - Container: `bg-white/50 dark:bg-[#262626]/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700` → `SURFACE_ALT` + `` border-b border-zinc-300 dark:border-zinc-700`` (drop `backdrop-blur-sm` entirely; keep `h-16 flex items-center justify-between px-6`).
   - Selected-chapter title `<h2>{selectedChapter.title}</h2>` and the three tab-title `<h2>` elements (`Charakter-Verwaltung`, `Orte`, `Notizen`): `text-gray-800 dark:text-gray-200` → `TEXT_PRIMARY` (keep `text-lg font-serif`).
   - Word count `<span>`: `text-gray-500 dark:text-gray-400` → `TEXT_MUTED`.
   - `Kein Kapitel ausgewählt` `<span>`: `text-gray-500 dark:text-gray-400` → `TEXT_MUTED`.
   - Save `<button>`: `bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349]` → `${ACCENT} text-white ${RADIUS}` (keep `px-4 py-2 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`).

Nothing else in this file changes — the imported components (`LeftSidebar`, `RightSidebar`, `ManuscriptView`, `CharactersView`, `PlacesView`, `NotesView`, all the modals) are already fully migrated and out of scope here.

### Verification
- `npx tsc --noEmit` clean.
- `npm test` — no regressions (no test file currently covers `page.tsx` directly; confirm the existing suite still passes).
- `npm run build` succeeds.
- `grep -n "gray-\|#4A7C59\|#3d6349\|rounded-lg\|backdrop-blur" frontend/src/app/page.tsx` — should only still match the three explicitly-out-of-scope root wrapper lines (the `bg-[#F5F5F5] dark:bg-[#1A1A1B]` ones), nothing else.

## Task 2: `frontend/src/app/error.tsx`

Migrate every in-scope color/radius/shadow class. Root wrapper div (`min-h-screen flex items-center justify-center bg-[#F5F5F5] dark:bg-[#1A1A1B]`) is OUT OF SCOPE — leave its background classes untouched.

1. Card panel div: `bg-white dark:bg-[#262626] rounded-lg shadow` → `${MODAL_PANEL}` (keep `p-8 max-w-md text-center`).
2. `<h2>Etwas ist schiefgelaufen</h2>`: add `TEXT_PRIMARY` (currently has no color class at all — inherits body text color; make it explicit). Keep `text-lg font-semibold mb-2`.
3. `<p>Der Fehler wurde protokolliert...</p>`: `text-gray-500 dark:text-gray-400` → `TEXT_MUTED` (keep `text-sm mb-4`).
4. `<button>Erneut versuchen</button>`: `rounded bg-blue-600 text-white hover:bg-blue-700` → `${ACCENT} text-white ${RADIUS}` (keep `px-4 py-2`).

### Verification
- `npx tsc --noEmit` clean.
- `npm test` — no regressions.
- `npm run build` succeeds.
- `grep -n "gray-\|blue-600\|rounded-lg\|rounded \|shadow\b" frontend/src/app/error.tsx` — should only still match the out-of-scope root wrapper line.

## Sequencing

Two independent, single-file tasks — no shared state between them. Either order works; run Task 1 then Task 2.
