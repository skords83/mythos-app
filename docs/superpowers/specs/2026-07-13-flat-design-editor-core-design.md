# Flat-Design-Refactor für den Editor-Kern — Design

**Datum:** 2026-07-13
**Status:** Genehmigt
**Teil von:** Phase 2 (Core-Editor & Datensicherheit) der 6-Phasen Multi-User-Roadmap (2026-07-12, Nutzer-Entscheidung, nicht im Repo dokumentiert) — Sub-Projekt 2 von 4 (nach Local-First Fallback, vor Smart Mentions, Block-Drag-and-Drop)

## Problem

Die App nutzt aktuell durchgängig weiche Rundungen (`rounded-lg/xl/2xl/full`), weiche Schatten (`shadow-md/lg/xl`) und einen grünen Akzent. Die Roadmap legt für den Multi-User-Umbau ein Neo-Brutalism/High-Contrast-Flat-Designsystem fest (harte Kanten, Offset-Schatten nur auf Top-Level-Elementen, zinc/stone/indigo-Palette). Bisher ist das nur in neu gebauten Komponenten (z.B. `DraftRecoveryBanner`) umgesetzt — der Rest der App (~30 Komponenten) ist im alten Stil.

## Ziel

Der Editor-Kern — die Haupt-Arbeitsfläche, in der Autor:innen den Großteil ihrer Zeit verbringen — auf das neue Designsystem umstellen, ohne bestehende Komponentengrenzen, Tests oder Funktionalität anzufassen. Rest der App (Modals, Dashboard, Login) folgt als eigenes Sub-Projekt.

## Entscheidungen (mit Nutzer abgestimmt)

| Frage | Entscheidung |
|---|---|
| Umfang | Editor-Kern zuerst: `ManuscriptView`, `LeftSidebar`, `RightSidebar`, `RichTextEditor`, `WordProgress`, `CharactersView`, `PlacesView`, `NotesView` + deren Inline-Kindkomponenten (`CharacterCard`, `CharacterListItem`, `CharacterQuickCard`, `PlaceCard`, `NoteCard`, `ChapterItem`) |
| Out of Scope | Modals (`Add*Modal`, `Edit*Modal`, `ExportModal`, `SearchModal`, `ConfirmDialog`), `Toast`, Dashboard (`dashboard/page.tsx`), Login (`login/page.tsx`) — eigenes Folge-Sub-Projekt |
| Umsetzung | Shared Style-Konstanten in neuem `frontend/src/lib/theme.ts` statt Inline-Tailwind-Strings oder neuer Primitive-Komponenten — verhindert Drift zwischen Dateien, ohne Komponentenstruktur anzufassen |
| Sequenzierung innerhalb des Sub-Projekts | Sidebars zuerst (alles andere ist darin verschachtelt) → ManuscriptView/RichTextEditor/WordProgress → CharactersView+Cards → PlacesView+Cards → NotesView+Cards |
| Verifikation | `tsc --noEmit` + volle Jest-Suite nach jeder Gruppe (bestätigt: keine bestehenden Tests prüfen auf Tailwind-Klassen-Strings). Kein Docker/Postgres in dieser Sandbox verfügbar → kein Live-Browser-Walkthrough hier möglich, `next dev` erlaubt aber Rendering ohne Auth/Daten. Echte visuelle Abnahme erfolgt im Nutzer-Environment. |

## Architektur

Kein struktureller Eingriff — reines Styling-Refactoring. Neue Datei `frontend/src/lib/theme.ts` exportiert benannte Tailwind-Klassen-Konstanten, abgeleitet 1:1 aus den in der Roadmap gesperrten Design-Entscheidungen:

```ts
export const SURFACE = "bg-stone-50 dark:bg-zinc-950";
export const SURFACE_ALT = "bg-stone-100 dark:bg-zinc-900";
export const TEXT_PRIMARY = "text-zinc-900 dark:text-zinc-200";
export const ACCENT = "bg-indigo-600 hover:bg-indigo-700";
export const RADIUS = "rounded-none";
export const BADGE_RADIUS = "rounded-sm";
export const CARD_SHADOW = "shadow-[4px_4px_0_0_#18181b]";
export const PANEL_BORDER_R = "border-r-2 border-zinc-900 dark:border-zinc-700";
export const PANEL_BORDER_L = "border-l-2 border-zinc-900 dark:border-zinc-700";
```

Komponenten importieren diese Konstanten statt eigene Tailwind-Strings zu hardcoden. Die genaue Konstanten-Liste wird während der Implementierung bei Bedarf ergänzt (z.B. Border für Karten vs. Panels), bleibt aber im selben Muster.

## Komponenten / Migrationslogik

Pro Datei, mechanisch:

- `rounded-lg`/`rounded-xl`/`rounded-2xl`/`rounded-full` → `RADIUS` (`rounded-none`), außer kleine Badges → `BADGE_RADIUS`
- `shadow-md`/`shadow-lg`/`shadow-xl` → entfernt, oder `CARD_SHADOW` auf dem äußersten klickbaren Karten-/Panel-Element (nicht auf verschachtelten Kindelementen wie Icons oder Text)
- `green-*`-Klassen (Akzentfarbe) → `ACCENT`
- Sidebar-Ränder (`LeftSidebar`/`RightSidebar`) → `PANEL_BORDER_R`/`PANEL_BORDER_L`

Ein Commit pro Komponente oder kleiner logischer Gruppe, analog zum Task-für-Task-Vorgehen bei Local-First Fallback.

## Reihenfolge

1. `frontend/src/lib/theme.ts` anlegen
2. `LeftSidebar`, `RightSidebar`
3. `ManuscriptView`, `RichTextEditor`, `WordProgress`
4. `CharactersView`, `CharacterCard`, `CharacterListItem`, `CharacterQuickCard`
5. `PlacesView`, `PlaceCard`
6. `NotesView`, `NoteCard`
7. `ChapterItem` (wird von `LeftSidebar` gerendert, ggf. schon in Schritt 2 miterledigt)

## Fehlerbehandlung / bekannte Grenzen

- Rein visuelles Refactoring — keine Änderung an Datenfluss, State-Management oder API-Aufrufen. Regressionsrisiko ist auf visuelle Inkonsistenzen beschränkt, nicht auf Funktionalität.
- Kein Live-Browser-Test in dieser Sandbox möglich (kein Docker/Postgres) — analog zu allen vorherigen Sub-Projekten dieser Roadmap. `tsc`/Tests/Build sind die verfügbaren automatisierten Prüfungen; visuelle Endabnahme liegt beim Nutzer.
- Dark-Mode-Varianten sind Teil jeder Konstante in `theme.ts` (keine separate Dark-Mode-Nacharbeit nötig).

## Testing

- `tsc --noEmit` sauber nach jeder Komponentengruppe.
- Volle Jest-Suite (aktuell 69 Tests) bleibt grün — keine Anpassung an bestehenden Tests nötig, da keiner auf Tailwind-Klassen prüft.
- Keine neuen automatisierten Tests nötig (reines Styling, kein neues Verhalten) — Ausnahme: falls `theme.ts`-Konstanten fehlerhaft zusammengesetzt werden könnten, ist das durch `tsc`/Build bereits abgedeckt.

## Out of Scope (spätere Sub-Projekte von Phase 2)

- Rest der App (Modals, Dashboard, Login) — Flat-Design-Folge-Sub-Projekt
- Smart Mentions (@)
- Block-Drag-and-Drop
