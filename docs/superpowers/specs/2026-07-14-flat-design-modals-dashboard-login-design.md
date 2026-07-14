# Flat-Design-Refactor für Modals, Dashboard und Login — Design

**Datum:** 2026-07-14
**Status:** Genehmigt
**Teil von:** Phase 2 (Core-Editor & Datensicherheit) der 6-Phasen Multi-User-Roadmap (2026-07-12, Nutzer-Entscheidung, nicht im Repo dokumentiert) — Folge-Sub-Projekt zu Sub-Projekt 2 (Flat-Design Editor-Kern, siehe `docs/superpowers/specs/2026-07-13-flat-design-editor-core-design.md`)

## Problem

Der Editor-Kern (Sidebars, Manuscript-Editor, Characters/Places/Notes-Views) wurde bereits auf das Neo-Brutalism/High-Contrast-Flat-Designsystem umgestellt. Der Rest der App — Modals, Dashboard und Login — nutzt weiterhin weiche Rundungen (`rounded-lg/xl/2xl`), weiche Schatten (`shadow-md/lg/xl`), Glasmorphismus (`backdrop-blur-sm`), einen Gradient-Akzent (`from-[#4A7C59] to-[#6B9E7C]`) und den alten grünen Hex-Akzent (`#4A7C59`). Das im Editor-Kern-Sub-Projekt explizit als Folgearbeit benannte Sub-Projekt.

## Ziel

Modals, Dashboard und Login auf das bestehende Designsystem (`frontend/src/lib/theme.ts`) umstellen, ohne Komponentengrenzen, Tests oder Funktionalität anzufassen. Damit ist die gesamte App auf einem einheitlichen visuellen System.

## Entscheidungen (mit Nutzer abgestimmt)

| Frage | Entscheidung |
|---|---|
| Umfang | `AddCharacterModal`, `EditCharacterModal`, `AddPlaceModal`, `EditProjectModal`, `CreateProjectModal`, `ExportModal`, `SearchModal`, `ConfirmDialog`, `Toast`, `ProjectCard`, `dashboard/page.tsx`, `login/page.tsx`, plus Entfernen der verwaisten `.card-hover`-Regel in `globals.css` |
| Semantische Farben | Fehler-/Erfolgs-/Danger-Zustände (rote Error-Banner, roter Toast, roter Danger-Button in `ConfirmDialog`) bleiben bewusst semantisch rot/grün — nur harte Kanten, kein Gradient, kein weicher Schatten werden angeglichen. Die Roadmap sperrt nur die zinc/stone/indigo-Chrome-Palette, keine Statusfarben. |
| Neue Theme-Tokens | `OVERLAY`, `MODAL_PANEL`, `INPUT`, `BUTTON_SECONDARY` werden zu `theme.ts` hinzugefügt (siehe Architektur). Primärbuttons nutzen weiterhin `ACCENT` + `text-white` + `RADIUS` inline, kein neuer Token nötig. |
| Umsetzung | Gleiches Muster wie im Editor-Kern: shared Style-Konstanten aus `theme.ts` statt Inline-Tailwind-Strings, keine neuen Primitive-Komponenten |
| Sequenzierung | `theme.ts`-Erweiterung → `ConfirmDialog`/`Toast` (klein, von vielen Stellen genutzt) → Modals → Dashboard (`ProjectCard` + `page.tsx`) → Login → `globals.css`-Aufräumen (erst nachdem `ProjectCard` `.card-hover` nicht mehr referenziert) |
| Verifikation | `tsc --noEmit` + volle Jest-Suite nach jeder Gruppe. Kein Docker/Postgres in dieser Sandbox → kein Live-Browser-Test hier, `next dev` erlaubt Rendering ohne Auth/Daten. Echte visuelle Abnahme erfolgt im Nutzer-Environment. |

## Architektur

Kein struktureller Eingriff — reines Styling-Refactoring. `frontend/src/lib/theme.ts` wird um vier Konstanten erweitert:

```ts
export const OVERLAY = 'fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 animate-fade-in'
export const MODAL_PANEL = 'bg-stone-50 dark:bg-zinc-900 rounded-none shadow-[4px_4px_0_0_#18181b] border border-zinc-900 dark:border-zinc-700'
export const INPUT = 'w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-none bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-600 outline-none'
export const BUTTON_SECONDARY = 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
```

`OVERLAY` ersetzt `bg-black/50 backdrop-blur-sm` (kein Blur — widerspricht Flat-Design). `MODAL_PANEL` ersetzt `bg-white dark:bg-[#262626] rounded-xl/2xl shadow-xl` auf dem äußersten Modal-Element. `INPUT` ersetzt alle Formularfeld-Styles (`border-gray-300 ... focus:ring-[#4A7C59]`) in Modals und Login. `BUTTON_SECONDARY` ersetzt Cancel-/Abbrechen-Buttons.

## Komponenten / Migrationslogik

Pro Datei, mechanisch:

- Overlay-Wrapper (`fixed inset-0 bg-black/50 backdrop-blur-sm ...`) → `OVERLAY`
- Modal-Panel (`bg-white dark:bg-[#262626] rounded-xl/2xl shadow-xl`) → `MODAL_PANEL`
- Formularfelder (Input/Textarea/Select mit `border-gray-300`, `focus:ring-[#4A7C59]`) → `INPUT`
- Sekundär-/Abbrechen-Buttons → `BUTTON_SECONDARY` + `RADIUS`
- Primär-/Submit-Buttons (`bg-[#4A7C59]`) → `ACCENT` + `text-white` + `RADIUS`
- `rounded-lg/xl/2xl/full` → `RADIUS`, außer kleine Badges → `BADGE_RADIUS`
- `text-gray-*`/`border-gray-*` (neutrale Chrome, nicht Statusfarben) → `TEXT_PRIMARY`/`TEXT_SECONDARY`/`TEXT_MUTED`/`BORDER`
- Login-Icon-Gradient (`bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C]`) → flacher `ACCENT`-Block ohne Gradient
- `ProjectCard`: `.card-hover`-Klasse entfernen, durch `HOVER_SURFACE`-Äquivalent oder direkte Hover-Klasse ersetzen (analog zu Task 5 im Editor-Kern-Sub-Projekt, wo `.card-hover` bereits aus `PlaceCard` entfernt wurde)

Ein Commit pro Komponente oder kleiner logischer Gruppe.

## Reihenfolge

1. `frontend/src/lib/theme.ts` um `OVERLAY`, `MODAL_PANEL`, `INPUT`, `BUTTON_SECONDARY` erweitern
2. `ConfirmDialog`, `Toast`
3. Modals: `CreateProjectModal`, `EditProjectModal`, `AddCharacterModal`, `EditCharacterModal`, `AddPlaceModal`, `ExportModal`, `SearchModal`
4. Dashboard: `ProjectCard.tsx` (inkl. `.card-hover`-Entfernung), `dashboard/page.tsx`
5. `login/page.tsx`
6. `globals.css`: `.card-hover`-Regel entfernen, nachdem repo-weit geprüft wurde, dass keine Komponente sie mehr referenziert

## Fehlerbehandlung / bekannte Grenzen

- Rein visuelles Refactoring — keine Änderung an Datenfluss, State-Management, Validierung oder API-Aufrufen. Regressionsrisiko ist auf visuelle Inkonsistenzen beschränkt, nicht auf Funktionalität.
- Kein Live-Browser-Test in dieser Sandbox möglich (kein Docker/Postgres) — analog zu allen vorherigen Sub-Projekten dieser Roadmap. `tsc`/Tests/Build sind die verfügbaren automatisierten Prüfungen; visuelle Endabnahme liegt beim Nutzer.
- Dark-Mode-Varianten sind Teil jeder neuen Konstante (keine separate Dark-Mode-Nacharbeit nötig).
- Semantische Statusfarben (Rot/Grün für Fehler/Erfolg/Danger) bleiben unverändert — explizit aus dem Umfang ausgeschlossen (siehe Entscheidungstabelle).

## Testing

- `tsc --noEmit` sauber nach jeder Komponentengruppe.
- Volle Jest-Suite bleibt grün — keine Anpassung an bestehenden Tests nötig, da keiner auf Tailwind-Klassen-Strings prüft.
- Keine neuen automatisierten Tests nötig (reines Styling, kein neues Verhalten).

## Out of Scope

- Statusfarben-Vereinheitlichung (semantisches Rot/Grün bleibt)
- Smart Mentions (@), Block-Drag-and-Drop (spätere Sub-Projekte von Phase 2)
- Family-Page-Frontend / Visibility-Selector (Phase 1, separates Gleis)
