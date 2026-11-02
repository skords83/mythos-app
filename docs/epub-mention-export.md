# Namensverknüpfungen im Buchexport

## Nachgewiesene Ursache und Historie

`RichTextEditor` meldet `editor.getHTML()`; `useChapters` sendet diesen HTML-String an die Kapitel-API. Das Prisma-Feld ist JSON, der Editor-/Exportpfad unterstützt HTML direkt als String sowie ältere Objekte mit einem HTML-String in `content` (`extractContent`). Die API speichert den Inhalt ohne Mention-Konvertierung.

Im Editor sind Verknüpfungen atomare Tiptap-Knoten `characterMention` und `entityMention`. Gespeichert werden `span[data-character-mention]` bzw. `span[data-entity-mention]`, Ziel-ID, `data-label` und Text `@${label}`. Orte und Gegenstände verwenden denselben Mechanismus. Die Massenverknüpfung in `bulkNameLinks.ts` erzeugt dieselbe Struktur mit der gefundenen Namensform als Label. Es werden keine Link-Elemente für diese Verknüpfungen erzeugt.

Der Projektexport lädt Kapitel und entpackt `content`; beim aktuellen Kapitel verwendet er gegebenenfalls den noch ungespeicherten Editor-HTML-Stand. `buildEpubArchive` parst dieses HTML, bettet Bilder ein und serialisiert die DOM-Knoten nach `OEBPS/content.xhtml`. Bisher fehlte die Umwandlung der Mention-Spans. PDF übernahm ebenfalls das HTML; Markdown/RTF/DOCX sammelten dessen Text einschließlich `@`.

- `276d880` (17.07.2026): Einführung der Character-Mentions mit gespeichertem `@`-Präfix; der vorhandene Export entfernte diese Markierung nicht.
- `3bb87e0`: Entity-Mentions mit derselben Darstellung.
- `955dd57`: EPUB-Bildverarbeitung und XML-Serialisierung; keine Mention-Bereinigung.
- `aa9ff82` (17.10.2026): Massenverknüpfung setzt solche Spans auch um zuvor normale Namen. Dies kann das verstärkte Auftreten erklären, ist aber ohne Projekthistorie kein nachgewiesener Auslöser des konkreten Berichts.

## Korrektur und Grenzen

`parseExportHtml` bearbeitet ausschließlich eine neue DOM-Kopie für den Export. Es ersetzt die beiden tatsächlich erzeugten Mention-Spans durch Text aus `data-label`, entsprechend der Label-Auswertung des Editors. Ohne Label wird genau ein führendes `@` im Span-Text entfernt. Alle Attribute des ersetzten Editor-Elements entfallen; umgebende Formatierungen, Absätze und reguläre Links bleiben bestehen. EPUB, PDF und der gemeinsame Markdown-/RTF-/DOCX-Parser verwenden diese Funktion. Editor, Datenbank und Referenzverwaltung werden nicht verändert.

Nicht markiertes `@Fabian`, E-Mail-Adressen und absichtliche `@` bleiben unverändert. Ohne Mention-Metadaten ist keine sichere Unterscheidung möglich. Auch durch die Referenzverwaltung bereits entfernte Verknüpfungsmarker werden nicht heuristisch rekonstruiert. Strukturierte Tiptap-JSON-Dokumente werden zwar von Teilen der Integrations-/Referenzverwaltung verstanden, vom bestehenden `extractContent`-Exportpfad aber nicht unterstützt; diese separate Einschränkung wird hier nicht verändert.

## Reproduktion und Verifikation

Vor der Korrektur schlagen beide Archivtests (HTML-String und Objekt-Wrapper) sowie der gemeinsame Textparser-Test fehl: `@Fabian, @Fräulein Müller! @Köln am Rhein; @@Amulett.` statt der lesbaren Namen. Die Tests erzeugen ein echtes ZIP, laden es erneut und prüfen gültiges XHTML, mehrere Namen, Satzzeichen, mehrteilige Namen, Umlaute, Alias-Label, Formatierungen, Leerzeichen, Links, E-Mail und literales `@`. Ein echter Tiptap-Editor wird mit den gespeicherten Spans initialisiert; HTML und auflösbare Klickziele bleiben nach dem Export unverändert.

Ein reproduzierbares Testartefakt lässt sich ohne Datenbankzugriff erzeugen:

```sh
cd frontend
EPUB_TEST_ARTIFACT=/tmp/mythos-mention-regression.epub npm test -- --runInBand src/lib/__tests__/exportMentions.test.ts
unzip -p /tmp/mythos-mention-regression.epub OEBPS/content.xhtml
```

Es werden ausschließlich synthetische Buchinhalte verwendet.

Prüflauf auf `33ad256` mit Korrektur (02.11.2026): 104 Jest-Suites mit 707 Tests erfolgreich, 5 Suites/30 Tests gemäß bestehender Konfiguration übersprungen. `npm run lint` und `npm run build` erfolgreich; vorhandene Hook-/Image-/Sentry-Warnungen bleiben bestehen. Das Test-EPUB wurde zusätzlich per `unzip` entpackt und mit Python ElementTree unabhängig auf gültiges XML und erwartete Texte geprüft. Kein Zugriff auf produktive Buchinhalte.
Die separate Typprüfung `npx tsc --noEmit --incremental false` nach dem abgeschlossenen Build sowie `git diff --check` waren ebenfalls erfolgreich.
