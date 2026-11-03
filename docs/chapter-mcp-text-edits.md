# Sichere Kapitelüberarbeitung über MCP

## Diagnose

`Chapter.content` ist ein Prisma-JSON-Feld. Bestehende Kapitel enthalten HTML,
HTML-Wrapper mit Metadaten oder Tiptap-Dokumente. Der Vollersatzrenderer akzeptiert
absichtlich nur einen begrenzten Tiptap-Prosaumfang. Mentions, Kommentaranker und
andere nicht unterstützte Knoten lösen den gemeldeten Fehler aus; der Renderer
kann ihre Identität nicht verlustfrei rekonstruieren. Diese Sperre bleibt bestehen.

`chapterTextEdits` war bereits intern implementiert und sogar als Alternative im
aktuellen Serverschema von `mythos_propose_chapter_update` registriert. Es fehlte
ein eigenes Tool. Außerdem waren leere Ersetzungen und Absatzumbauten nicht
unterstützt. Die in dieser Sitzung eingebundene Verbindung „Mythos Vollzugriff“
zeigt noch die alte Beschreibung und das alte Schema ohne diesen Modus.

Rein lesende Produktionsprüfung am 3. November 2026: Kapitel
`cmvtqmdts01b2d7ycp8hy0fip` im Projekt `cmu09pejc0001o3rrondym6tb` liefert Seite 1
von 3 mit HTML und Revision `2026-11-02T09:02:47.904Z`. Beim Folgeaufruf über den
vorhandenen Connector wird das übergebene `expectedUpdatedAt` nicht bis zum
Server transportiert; dieser antwortet `Continuation requires expectedUpdatedAt
from page 1`. Damit wurde ein konkretes Problem des alten veröffentlichten bzw.
zwischengespeicherten Toolvertrags reproduziert. Der produktive Kapiteltext wurde
nicht geändert. Ein vollständiger Produktionsabruf über diese alte Verbindung
konnte nicht bestätigt werden.

## Werkzeuge und Ablauf

1. `mythos_chapter({projectId, id})` lesen. Bei `serialization: "json-chunks"` alle
   Seiten mit `page: nextPage` und `expectedUpdatedAt: updatedAt` von Seite 1 holen.
   Die `chunk`-Strings zusammenfügen und **erst dann** einmal JSON-parsen. Bei
   Revisionskonflikten erneut ab Seite 1 beginnen.
2. Mit `mythos_propose_chapter_text_edits` einen Vorschlag einreichen. Pflichtfelder:
   `projectId`, `chapterId`, `expectedUpdatedAt`, `title`, `edits`.
3. Die Antwort enthält `status: 201`, `state: "PENDING"`, `proposalId` und
   `approvalUrl`; zusätzlich zur JSON-Textantwort gibt es MCP-`structuredContent`
   mit veröffentlichtem Ausgabeschema.
4. Der Nutzer prüft Original, Vorschau und Textvergleich in Mythos und bestätigt
   ausdrücklich. Erst dann wird gespeichert und die vorherige Fassung gesichert.

Beide OAuth-Scopes `mythos:read mythos:write` sind erforderlich. Eigentumsprüfung,
24-Stunden-Ablauf, Ablehnung/erneutes Einreichen, erneute Validierung bei Freigabe,
serielle Transaktion und bedingtes Revisionsupdate bleiben bestehen. MCP bietet
keine Freigabefunktion. Das bisherige `mythos_propose_chapter_update` bleibt
kompatibel und kann weiterhin `content: {type: "chapterTextEdits", edits}` verwenden.

### Einzelne Textknoten

`segments` liefert revisionsgebundene IDs sowie `text` und `protected`:

```json
{
  "projectId": "PROJEKT-ID",
  "chapterId": "KAPITEL-ID",
  "expectedUpdatedAt": "REVISION-AUS-DEM-LESEAUFRUF",
  "title": "Aktueller Kapiteltitel",
  "edits": [
    {"nodeId": "html.0.0", "before": "Alter Text ", "after": "Neuer Text "},
    {"nodeId": "html.1.0", "before": "Überflüssiger Satz.", "after": ""}
  ]
}
```

IDs und `before` immer exakt aus der aktuellen Antwort übernehmen. `after` ist
Text, kein HTML. Leere Ersetzung entfernt einen ungeschützten Textknoten; bei
Tiptap entstehen keine unzulässigen leeren Textknoten. Unverändertes HTML außerhalb
der ersetzten Textknoten bleibt bytegenau erhalten. Geschützte Segmente sind
nicht direkt editierbar.

### Zusammenhängende Absatzbereiche

`blocks` enthält `{nodeId, editable, text, tokens}`. Beispiel für einen Absatz:

```json
{
  "nodeId": "blocks.0-0",
  "editable": true,
  "text": "Vor ⟦mythos:0:1⟧ stand der Wagen.",
  "tokens": [{"token": "⟦mythos:0:1⟧", "text": "@Fabian"}]
}
```

`blocks.START-END` bezeichnet einen inklusiven Bereich gemäß den gelieferten IDs.
`before` besteht aus den zugehörigen `block.text`-Werten, verbunden mit `\n\n`.
`after` ist die überarbeitete Fassung mit `\n\n` zwischen Absätzen. Beispielsweise:

```json
{
  "nodeId": "blocks.0-0",
  "before": "Vor ⟦mythos:0:1⟧ stand der Wagen.",
  "after": "Neben ⟦mythos:0:1⟧ wartete der Wagen.\n\nDie Reise begann."
}
```

Damit sind Teilen, Zusammenführen, Kürzen, Einfügen, Entfernen und Umstellen von
Absätzen möglich. Eine größere Neufassung kann einen ganzen zusammenhängenden
Bereich umfassen. Mehrere disjunkte Bereiche dürfen im selben Vorschlag stehen.
Ein leeres `after` entfernt einen Bereich nur dann, wenn er keine geschützten
Inline-Platzhalter enthält. Innerhalb eines Vorschlags dürfen Textknoten- und
Absatzbereichsadressen nicht gemischt werden; überlappende Bereiche sind Konflikte.

Jeder Platzhalter muss **genau einmal** innerhalb seines Bereichs erhalten bleiben.
Er bezeichnet das ursprüngliche Inline-Element, nicht dessen Anzeigenamen.
Identische Namen können verschiedene IDs haben. Mentions, Kommentare, Bilder,
Links, harte Zeilenumbrüche und Formatierungen werden als unveränderliche
Inline-Inhalte übernommen. Fehlende, doppelte, erfundene oder beschädigte Tokens
liefern einen präzisen Konflikt. Keine vom Modell erzeugten IDs oder HTML-Fragmente
werden eingesetzt.

Der automatische Abgleich verwendet exakte Absatzvorlagen: unveränderte oder
umgestellte Absätze werden vollständig aus dem Original übernommen, ebenso
unveränderte Inline-Inhalte und passende unveränderte Textsegmente. HTML außerhalb
der ausgewählten Bereiche bleibt bytegenau erhalten; nur bearbeitete Bereiche
werden zusammengesetzt. Bei strukturellen Umbauten kann Zwischenraum zwischen
Absatz-Tags innerhalb des Bereichs entfallen. Tiptap-Attribute und Wrapper-Metadaten
bleiben erhalten. Eine freie Klartext-Neufassung ohne Platzhalter wird nicht
heuristisch anhand von Namen mit Entitäts-IDs verknüpft.

## Schutz und Grenzen

- Absatzumbauten gelten für einfache Absätze auf Dokumentebene ohne eigene
  Attribute/Markierungen. Listen, Überschriften, verschachtelte Strukturen,
  Absätze mit IDs/Klassen, defektes HTML oder mehrdeutige Vorlagen werden als
  `editable: false` ausgewiesen. Hier sind sichere Textknotenänderungen weiterhin
  möglich. Geschützte Inline-Inhalte selbst werden im Mythos-Editor bearbeitet.
- Kommentare sind separate Datensätze mit `commentId`-Markierungen im Dokument,
  keine gespeicherten Zeichenoffsets. Weder ihre Daten noch ihre markierten
  Originaltexte werden verändert. Formatierte Inhalte bleiben ebenfalls erhalten.
- Zusätzlich werden bestehende `SourceEvidence`-Zitat-/Kontextanker geprüft.
  Ein zuvor eindeutig auffindbarer Anker darf durch den Vorschlag nicht fehlen
  oder mehrdeutig werden. Die Prüfung wird bei Freigabe mit den dann vorhandenen
  Belegen wiederholt. Belegdatensätze werden nicht verändert. Ein geänderter
  Dokumenthash kann sie nach bestehender Logik als `STALE` markieren; bereits
  fehlende Belege werden nicht stillschweigend repariert.
- 1–1000 Änderungen, maximal 500000 JSON-Zeichen Änderungsdaten. Revisionen müssen
  aktuell sein. Bei Konflikten neu lesen und einen neuen Vorschlag erstellen.
- Ein leeres Kapitel kann weiterhin über den kompatiblen Vollersatz befüllt werden.
  Absatzbereiche benötigen mindestens einen vorhandenen editierbaren Absatz.

## Verifikation und Auslieferung

Automatisierte Tests verwenden ausschließlich synthetische Daten. Der echte
HTTP-Test mit offiziellem MCP-SDK prüft `tools/list` einschließlich Eingabe- und
Ausgabeschema, vollständige Pagination, große Überarbeitungen für HTML/Wrapper/
Tiptap, unveränderte IDs/Kommentare/Belege, Revisionskonflikte, Prüfung und Freigabe,
Backup und doppelte Freigabe. Ein nach Vorschlagserstellung neu hinzugefügter
betroffener Quellenanker verhindert die Übernahme. Der Test ist im CI-Job
`isolated-postgres` registriert.

Nach Merge/Deployment muss die Verbindung ihre Werkzeugliste neu laden bzw. neu
verbunden werden. Prüfkriterien sind das sichtbare Tool
`mythos_propose_chapter_text_edits`, `expectedUpdatedAt` im Eingabeschema von
`mythos_chapter` und `blocks` im rekonstruierten Kapitel. Serverversion: `0.5.0`.
Nur lesende Grants benötigen außerdem erneute Autorisierung für Schreibrechte.
Ein lokaler SDK-Test beweist nicht, dass ein bestehender ChatGPT-Connector seinen
alten Vertrag bereits aktualisiert hat. Diese Änderung wird als PR ausgeliefert;
ein produktives Deployment oder eine Freigabe produktiver Kapitel ist nicht Teil
des Testlaufs.

Lokal ausgeführter Abschlussstand am 3. November 2026:

- Jest: 110 Suites / 769 Tests erfolgreich; 5 DB-Suites / 31 Tests im normalen
  Lauf bewusst deaktiviert.
- Die vier relevanten Kapitel-/Integritäts-DB-Suites separat aktiviert:
  20 Tests erfolgreich.
- Offizieller MCP-SDK über HTTP, echte isolierte PostgreSQL-Daten und
  Sitzungsschnittstellen für Prüfung/Freigabe: 273 Prüfungen erfolgreich.
- TypeScript, Lint, Produktionsbuild und `git diff --check` erfolgreich.
  Bestehende React-Hook- und Sentry-Konfigurationswarnungen bleiben bestehen.
- Codegraph aktualisiert. Keine Datenbankmigration nötig.
