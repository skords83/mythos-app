# Kapitel über MCP lesen und gezielt bearbeiten

## Befunde (2026-11-03)

Der Leseweg führt von `mythos_chapter` über die MCP-Argumentprüfung und OAuth-Ressourcen-/Scope-Prüfung zu `GET /api/integrations/chatgpt`. Nach Prüfung des Projekteigentümers wird `Chapter` nach `id` und `projectId` gelesen. Es gibt keine Auswahl einer `ChapterVersion`: `Chapter.content` ist der aktuelle gespeicherte Stand. `chapters.wordCount` ist ein separat gespeicherter Zähler und beweist allein keinen erfolgreichen Inhaltsabruf.

Der bisherige Transport serialisiert das Ergebnis als JSON in einem MCP-Textblock. Die Prüfung geschützter Inhalte gehört ausschließlich zum Schreibweg. Vorhandene Formate sind HTML-Strings, HTML-Wrapper `{content: string, ...metadata}`, Tiptap-Dokumente und leere Altbestände (`null`, `{}`, leerer String). Die alte Tool-Beschreibung versprach dagegen nur Tiptap JSON. Große Antworten wurden oberhalb 256 KiB explizit abgelehnt, ohne Fortsetzung. Daraus lässt sich keine Ursache einer leeren erfolgreichen Antwort ableiten.

Referenzprüfung: Kapitel 25 „Der richtige Ring“, Projekt „Trolle nach Süden“, wurde über die vorhandene produktive MCP-Verbindung rein lesend abgerufen. Die Übersicht meldete 1047 Wörter; der Kapitelaufruf lieferte einen nichtleeren HTML-String mit Figuren- und Orts-IDs, Revision `2026-11-02T09:02:47.904Z`. Der gemeldete leere Abruf wurde dabei nicht reproduziert. Für seine abschließende Diagnose fehlen der fehlgeschlagene originale Tool-Aufruf, dessen rohe MCP-Antwort/HTTP-Status, Zeitpunkt und Client-/Connector-Konfiguration. Ein clientseitiges Format-/Darstellungsproblem bleibt eine Hypothese.

Schreibfehler sind dagegen im Code reproduzierbar:

- `Invalid proposal` ersetzte in der Speicherung sämtliche konkreten Validierungsfehler: u.a. HTML statt Tiptap, nicht unterstützte Knoten/Markierungen, ungültige IDs/Titel und Revisionen.
- Das Schema erlaubte ISO-date-time; die Implementierung verlangte exakt die kanonische Millisekunden-Z-Darstellung. Gleichwertige Zeitstempel ohne Millisekunden oder mit Zeitzonenoffset wurden abgewiesen. Diese Abweichung ist korrigiert.
- Vollersatz verwendet absichtlich einen eingeschränkten HTML-Renderer. Erwähnungen, Kommentare, Bilder und weitere Strukturen passen nicht in diesen Renderer. Die bisherige zusätzliche Schutzprüfung sperrte das gesamte Kapitel schon bei vorhandenen Erwähnungen/Kommentaren, unabhängig von der Änderungsstelle (auch unbekannte Formate werden vorsichtig gesperrt).
- Ablauf nach 24 Stunden, fehlende Schreibrechte und zwischenzeitliche Revisionen sind eigenständige Ablehnungsgründe. Ohne die ursprünglichen abgelehnten Eingaben kann nicht festgestellt werden, welche Validierungsbedingung bei einem konkreten `Invalid proposal` ausgelöst wurde.

## Lesevertrag

`mythos_chapter({projectId, id})` liefert weiterhin `id`, `title`, `content`, `order`, `updatedAt`, zusätzlich:

- `contentFormat`: `html`, `html-wrapper`, `tiptap` oder `empty`.
- `text`: dekodierter Lesetext einschließlich Absatzumbrüchen und Mention-Labels.
- `blocks`: Absatzvorlagen `{nodeId, editable, text, tokens}` für zusammenhängende Überarbeitungen; siehe [neuen Bearbeitungsvertrag](chapter-mcp-text-edits.md).
- `segments`: `{nodeId, text, protected}` für adressierbare Textknoten. IDs sind ausschließlich für diese Revision gültig, keine Entitäts-IDs.

Der vollständige strukturierte Inhalt bleibt unter `content` erhalten. Leerer Inhalt liefert ein erfolgreiches Objekt mit leerem Text; nicht gefunden/fremdes Projekt liefert einen Fehler (404 ohne Offenlegung fremder Daten), unbekannte/defekte Speicherformate einen Verarbeitungsfehler (422), Authentifizierungsfehler 401/403. Ein leerer Upstream-Body wird als MCP-Toolfehler ausgegeben.

Ab mehr als 16000 JSON-Zeichen wird die vollständige serialisierte Antwort in `chunk` geliefert, mit `serialization: "json-chunks"`, `page`, `totalPages`, `nextPage`, `id` und `updatedAt`. Alle `chunk`-Strings in Reihenfolge verbinden und anschließend einmal `JSON.parse` aufrufen. Folgeseiten mit `page: nextPage` und `expectedUpdatedAt` aus Seite 1 lesen. Bei geändertem Stand neu ab Seite 1 beginnen. Keine stillschweigende Kürzung; das 256-KiB-Drahtlimit bleibt erhalten. `limit` steuert Listen, nicht Kapitelchunks.

## Gezielter Vorschlag

```json
{
  "projectId": "...",
  "chapterId": "...",
  "expectedUpdatedAt": "2026-11-03T10:00:00.000Z",
  "title": "Kapitelüberschrift",
  "content": {
    "type": "chapterTextEdits",
    "edits": [{"nodeId": "html.0.0", "before": "Alter Text ", "after": "Neuer Text "}]
  }
}
```

`nodeId` und `before` exakt aus `segments` übernehmen. Pro Knoten höchstens eine Änderung, 1–1000 Änderungen, maximal 500000 JSON-Zeichen für die Änderungsdaten. Ein leeres `after` entfernt jetzt ungeschützten Text. `after` ist Text, kein HTML. Textknoten können ersetzt oder entfernt werden. Das explizite Werkzeug `mythos_propose_chapter_text_edits` unterstützt außerdem Absatzbereiche einschließlich Teilen, Zusammenführen, Einfügen und Umstellen. Geschützte Inline-Inhalte bleiben dabei als eindeutige Platzhalter erhalten; Details und Grenzen stehen im [Bearbeitungsvertrag](chapter-mcp-text-edits.md). Änderungen innerhalb eines ungeschützten Knotens dürfen beliebig kurz oder lang sein.

HTML wird mit Quellpositionen geparst. Nur die gewählten Textstellen werden HTML-escaped ersetzt, von hinten nach vorne; jedes andere Byte einschließlich IDs, Ziele, Markup und Kommentaranker bleibt unverändert. Wrapper-Metadaten bleiben erhalten. Bei Tiptap werden nur die ausgewählten `text`-Felder in einer Kopie geändert; Attribute, Markierungen und die übrigen Knoten bleiben erhalten. Namen werden niemals zur Identitätszuordnung verwendet. Kommentare sind per `commentId`-Markierung im Kapitel verankert, nicht über externe numerische Offsets; Kommentar-Datensätze werden nicht geändert.

Geschützte Textbereiche liefern einen Konflikt mit `nodeId` und dem Hinweis auf die manuelle Bearbeitung in Mythos. Eine Änderung außerhalb dieser Bereiche ist möglich. Der alte eingeschränkte Tiptap-Vollersatz bleibt kompatibel, wird bei geschützten Kapiteln aber weiterhin abgelehnt und verweist auf Textänderungen.

Der Vorschlag bleibt `PENDING`. Die serverseitig erzeugte `preview` ermöglicht die bestehende Text-/Diff-Prüfung unter `/integrations/approvals`. Vorschläge werden dort per Sitzung erneut abgerufen und explizit genehmigt. MCP darf nicht genehmigen. Bei Genehmigung werden Änderungsdaten erneut validiert und gegen den aktuellen Kapitelinhalt angewandt; die Vorschau ist keine Schreibautorität. Die vorhandene serielle Transaktion, bedingte Revisionsaktualisierung, einmalige Übernahme und Sicherung des vorherigen Kapitels bleiben erhalten. Es ist keine Datenbankmigration nötig.

## Reproduzierbare Prüfung

Mit isolierter Testdatenbank und lokalem Server gemäß `chatgpt-mcp-local-testing.md`:

```sh
MYTHOS_RUN_MCP_INTEGRATION=1 node --env-file=.env.local scripts/test-chapter-mcp-http.mjs
```

Der Test verwendet den offiziellen MCP-SDK-Client über Streamable HTTP, echte PostgreSQL-Datensätze und den Sitzungspfad für Abruf/Freigabe. Er prüft Formate, Unicode, Chunks, Schutzkonflikte, Änderungen, Backup, Kommentare, ungültige/abgelaufene/veraltete Vorschläge und Berechtigungen. Er erzeugt ausschließlich eigene synthetische Fixtures und entfernt sie danach. Produktionskapitel werden nicht geändert.

## Historischer Prüfstand der ersten Reparatur (vor dieser Erweiterung)

- Produktionsreferenz rein lesend über den verbundenen Mythos-MCP-Connector: Übersicht und vollständiges Kapitel 25 erfolgreich, keine produktiven Änderungen.
- Neuer HTTP-Test über offiziellen MCP-SDK: erster Lauf 354 Prüfungen (sehr große Chunk-Fixture), abschließender erweiterter Lauf 130 Prüfungen mit kleinerer, weiterhin mehrseitiger Fixture und zusätzlicher Übernahme je Speicherformat. Beide erfolgreich. Freigabe und erneuter Vorschlagsabruf bewusst über die vorhandenen Sitzungsschnittstellen, nicht per MCP-Berechtigung.
- Gesamte Jest-Suite: 108 Suites, 741 Tests erfolgreich; 5 DB-Suites/31 Tests standardmäßig übersprungen. Davon die 3 relevanten Vorschlags-/Integritäts-DB-Suites separat aktiviert: 18 Tests erfolgreich.
- TypeScript-Prüfung, `npm run lint`, Produktionsbuild und `git diff --check` erfolgreich. Bestehende React-Hook-/Sentry-Warnungen bleiben. Codegraph gemäß Repository-Anweisung aktualisiert.
- Änderungen liegen lokal im Arbeitsbaum; kein Commit, Push oder Deployment durchgeführt. Kein Datenbankschemawechsel. Der aktualisierte Server wurde nicht über die produktive ChatGPT-Verbindung getestet; dort wurde nur der unveränderte Referenzfall gelesen.
- Direkte Änderungen an geschützten Bereichen sowie strukturelle Umbauten bleiben dem Mythos-Editor vorbehalten. Die ursprüngliche leere Client-Antwort und der konkrete damalige Validierungsfehler sind ohne Originalaufruf/Antwort nicht abschließend erklärbar.
