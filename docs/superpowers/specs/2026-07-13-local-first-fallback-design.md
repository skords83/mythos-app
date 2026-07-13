# Local-First Fallback für Kapitel-Editing — Design

**Datum:** 2026-07-13
**Status:** Genehmigt
**Teil von:** Phase 2 (Core-Editor & Datensicherheit) der 6-Phasen Multi-User-Roadmap (2026-07-12, Nutzer-Entscheidung, nicht im Repo dokumentiert) — Sub-Projekt 1 von 4 (vor Flat-Design-Refactor, Smart Mentions, Block-Drag-and-Drop)

## Problem

`useChapters.ts` speichert Editor-Änderungen ausschließlich über einen debounced (2s) PUT-Request an `/api/chapters/:id`. Es gibt keinerlei lokale Persistenz: Schlägt der Server-Save fehl (offline, 5xx, Netzwerkfehler) oder wird der Tab geschlossen bevor der nächste Save-Zyklus durchläuft, ist der ungesicherte Editor-Inhalt unwiederbringlich verloren — er existiert nur im React-State.

## Ziel

Ein lokales IndexedDB-Backup, das unabhängig vom Server-Save-Erfolg läuft, sodass beim erneuten Öffnen eines Kapitels ein neuerer, noch nicht gesicherter lokaler Entwurf erkannt und wiederhergestellt werden kann.

## Entscheidungen (mit Nutzer abgestimmt)

| Frage | Entscheidung |
|---|---|
| Trigger-Modell | Immer aktiv — IndexedDB-Write läuft bei jeder Änderung nach 300–500ms Debounce, unabhängig vom Server-Save-Ergebnis |
| Recovery-UX bei neuerem lokalem Entwurf | Banner mit aktiver Nutzerwahl (Wiederherstellen / Verwerfen), kein automatisches Überschreiben in beide Richtungen |
| Scope | Nur Kapitel-Text (`RichTextEditor`/`ManuscriptView`) — Notizen (`useNotes`) sind explizit **out of scope**, mögliches späteres Follow-up |
| IndexedDB-Zugriff | `idb`-Package (schlanker Promise-Wrapper, kein Dexie) — es wird nur ein einfacher Key-Value-Store gebraucht, keine reaktiven Queries |
| Background-Retry bei fehlgeschlagenem Server-Save | Kein aktives Retry (kein Online-Event-Listener/Polling) — Recovery erfolgt beim nächsten Öffnen des Kapitels, das reicht für "kein Datenverlust" |

## Architektur

Zwei sich ergänzende, unabhängige Debounce-Pfade auf demselben Editor-Content-Change:

1. **Bestehend, unverändert:** 2s-Debounce → Server-`PUT /api/chapters/:id`, inkl. bestehender Fehlerbehandlung (Error-Toast).
2. **Neu:** 300–500ms-Debounce → lokaler Write in `chapterDraftStore` (IndexedDB), läuft immer, unabhängig vom Ausgang von (1).

Nach erfolgreichem Server-`PUT` wird der lokale Draft-Eintrag für dieses Kapitel gelöscht (Server ist wieder Source of Truth, ein veralteter lokaler Eintrag hätte keinen Nutzen mehr).

## Komponenten

- **`frontend/src/lib/chapterDraftStore.ts`** — neues Modul, kapselt IndexedDB via `idb`. Ein Object Store `chapterDrafts`, Key = `chapterId`, Value = `{ chapterId: string, content: string, updatedAt: number }` (`content` ist der HTML-String aus `editor.getHTML()` — exakt derselbe Typ wie `editorContent` in `useChapters.ts`, nicht das rohe Tiptap-JSON; `Chapter.content: Json?` im Prisma-Schema speichert diesen HTML-String verbatim). API: `save(chapterId, content)`, `get(chapterId)`, `delete(chapterId)`.
- **`useChapters.ts`** — erhält den zweiten (300–500ms) Debounce-Effekt neben dem bestehenden 2s-Effekt; ruft `chapterDraftStore.save()` auf Content-Change, `chapterDraftStore.delete()` nach erfolgreichem PUT.
- **Recovery-Banner** (neue kleine Komponente, z.B. `DraftRecoveryBanner.tsx`, in `ManuscriptView.tsx` eingebunden) — erscheint nur wenn ein relevanter Draft gefunden wurde, mit den zwei Aktionen Wiederherstellen/Verwerfen.

## Datenfluss

### Speichern (bei jeder Editor-Änderung)
```
Editor onChange
  ├─ 2s Debounce → PUT /api/chapters/:id → Erfolg: chapterDraftStore.delete(chapterId)
  │                                      → Fehler: bestehender Error-Toast (unverändert)
  └─ 300–500ms Debounce → chapterDraftStore.save(chapterId, content, updatedAt=now)
```

### Laden (beim Öffnen eines Kapitels)
```
1. Server-Kapitel laden (wie bisher), enthält content + updatedAt
2. chapterDraftStore.get(chapterId)
3. Kein Draft ODER draft.updatedAt <= server.updatedAt
     → normal fortfahren, veralteten Draft opportunistisch löschen
4. draft.updatedAt > server.updatedAt
     → Banner anzeigen: "Ungesicherter lokaler Entwurf vom [Zeit] gefunden"
        ├─ Wiederherstellen → draft.content in Editor laden (Server-Content im Editor-State ersetzt), Draft bleibt in IndexedDB bis nächster erfolgreicher Server-Save ihn löscht
        └─ Verwerfen → chapterDraftStore.delete(chapterId), Server-Content bleibt aktiv
```

## Fehlerbehandlung / bekannte Grenzen

- Schlägt der Server-`PUT` fehl, ändert sich am bestehenden Error-Toast-Verhalten nichts. Der lokale Draft existiert bereits unabhängig davon und schützt vor Datenverlust — die Wiederherstellung passiert beim nächsten Laden des Kapitels (gleicher Tab nach Reload, oder erneuter Aufruf der Seite), nicht live in derselben Sitzung ohne Reload.
- Kein Schutz vor Multi-Device-Konflikten über den einfachen Zeitstempel-Vergleich hinaus (kein Merge, keine Conflict-Resolution-UI) — bei einem Konflikt entscheidet der Nutzer manuell über das Banner.
- Notizen (`useNotes`) bleiben ungeschützt — bewusst außerhalb des Scopes dieses Sub-Projekts.

## Testing

- Unit-Tests für `chapterDraftStore` (save/get/delete Round-Trip) mit `fake-indexeddb` in Jest.
- Unit-Test für die Recovery-Entscheidungslogik in `useChapters` (Zeitstempel-Vergleich: kein Draft / veralteter Draft / neuerer Draft).
- Komponenten-Test für `DraftRecoveryBanner` (Wiederherstellen-Klick lädt Draft-Content, Verwerfen-Klick löscht Draft und blendet Banner aus).

## Out of Scope (spätere Sub-Projekte von Phase 2)

- Flat-Design-Refactor (Neo-Brutalism-Designsystem, bereits in der Roadmap spezifiziert)
- Smart Mentions (@)
- Block-Drag-and-Drop
