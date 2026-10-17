# Szenen, Beziehungen und Quellenbelege – Implementierungsstand

Stand: 17.10.2026. Keine Änderungen an produktiven Projektinhalten; kein Deployment ausgeführt.

## Ausgangslage und Architekturentscheidung

| Bereich | Vorher vorhanden | Vorher über MCP | Umsetzung |
| --- | --- | --- | --- |
| Szenen | Prisma `Scene`, REST, Kapitelbaum, Metadatenpanel, Hooks und Tests | Nein | Bestehendes Modell vollständig erschlossen, Zuordnung und atomare Sortierung ergänzt |
| Beziehungen | Polymorphes `Relation`-Modell für CHARACTER, PLACE, ITEM, FACTION, SCENE, EVENT, LORE_ENTRY; gerichtete Kanten, freier Typ, label, Autor/Familie/Zeitstempel | Teilweise: Items/Fraktionen lesen und eigene sichtbare Kanten gesammelt ersetzen | Lesen und gezieltes Erstellen/Ändern/Entfernen einzelner Kanten |
| Quellenbelege | Kein Belegmodell; Editor besitzt stabile Kommentar-Markierungen (`commentId`), aber keine allgemeinen Block-IDs | Nein | Additives `SourceEvidence`-Modell, gemeinsamer Service, MCP und Oberfläche |

Im Repository und seinen Eltern wurde keine anwendbare AGENTS.md gefunden. CLAUDE.md verlangt Graphify-Abfragen und ein abschließendes AST-Update; beides ausgeführt.

`Scene` enthält `name`, `description`, `outline`, `tags`, `order`, `visibility`, `chapterId`, Autor/Familie und Zeitstempel. **Kein Szenenstatus, kein Szenen-Romantext.** Der Romantext bleibt ausschließlich in `Chapter.content`. Szenenänderungen und Verschiebungen verändern, kopieren oder löschen keinen Kapiteltext. Die neue Service-Schicht verwendet dieselben Prisma-Modelle, AuthContext- und Sichtbarkeitsregeln. Sie ergänzt keine zweite Szenen- oder Beziehungstabelle.

## Neue MCP-Werkzeuge

Alle Namen beginnen mit `mythos_`. Lesewerkzeuge brauchen `mythos:read`; Schreibwerkzeuge zusätzlich `mythos:write`. Schemas, Beschreibungen, Annotationen und OAuth-Metadaten sind in `story-tool-schema.ts` registriert und werden serverseitig validiert. Die MCP-Serverversion ist 0.4.0.

| Werkzeug | Funktion / notwendige Argumente |
| --- | --- |
| `mythos_scenes` | Vollständige sichtbare Szenen eines `chapterId`, einschließlich Beziehungen; `page`, `limit` optional |
| `mythos_scene` | Einzelne Szene über `id`, mit allen Feldern und sichtbaren Beziehungen |
| `mythos_create_scene` | `chapterId`, `name`; optionale vorhandene Szenenfelder; Einfügen am Ende |
| `mythos_update_scene` | `id`, `expectedUpdatedAt`; partielle Metadatenänderung und optional `chapterId` zum Verschieben |
| `mythos_reorder_scenes` | `chapterId`, vollständiges Array `scenes: [{id, expectedUpdatedAt}]` in gewünschter Reihenfolge |
| `mythos_relations` | `entityType`, `entityId`; beide Richtungen, vollständige Kanten mit ID und updatedAt; paginiert |
| `mythos_create_relation` | `sourceType`, `sourceId`, `targetType`, `targetId`, `relationType`, optional `label` |
| `mythos_update_relation` | `id`, `expectedUpdatedAt`; gezielt Endpunkte/Richtung, Typ oder Beschriftung ändern |
| `mythos_delete_relation` | `id`, `expectedUpdatedAt`; nur diese Kante entfernen |
| `mythos_evidence` | `entityType`, `entityId`; zugängliche Belege mit aktuellem Ankerstatus und Fundstellenkontext; paginiert |
| `mythos_create_evidence` | Wissensentität, `statement`, `chapterId`, `quote`, `sourceExpectedUpdatedAt`; optional `field`, `sceneId`, `prefix`, `suffix`, `commentId`, `flagged` |
| `mythos_update_evidence` | `id`, `expectedUpdatedAt`; partielle Änderungen, manuelle Prüfmarkierung oder Neuverankerung |
| `mythos_delete_evidence` | `id`, `expectedUpdatedAt`; einen Beleg entfernen |

Antworten: `{status, data}` bzw. `{status, error}`. Listen liefern `data.entries`, `page`, `hasMore`; Standardlimit 50, maximal 100. `409` bedeutet: neu lesen und Änderungen erneut prüfen, nicht blind wiederholen.

Ausgelassene Felder bleiben erhalten. `description`, `outline`, `label`, `field`, `sceneId`, `commentId` können mit `null` geleert werden; `tags: []` entfernt Tags. Name, Aussage und Zitat müssen nichtleer sein. Es gibt keine automatische Ableitung vermeintlicher Belege.

## Rechte, Konsistenz und Grenzen

- Szenen folgen der bestehenden Familien-/Sichtbarkeitsregel. Ändern und Verschieben nur als Autor; Zielkapitel muss zur Familie und zum selben Projekt gehören. Neue Szenen und verschobene Szenen werden anhand der maximalen Position angehängt, nicht anhand der Anzahl.
- Sortierung verlangt eine vollständige Permutation, ausschließlich eigene Szenen und jeden gelesenen Versionsstand. Fremde oder verborgene Szenen werden nicht mitsortiert. Sortierung und Änderungen laufen in serialisierbaren Transaktionen; Versionskonflikte rollen alle Änderungen zurück.
- Bereits belegte Szenen können erst verschoben werden, nachdem die Szenenzuordnung ihrer Belege ausdrücklich entfernt wurde. Der Kapitelbezug bleibt bestehen. Projektübergreifendes Verschieben ist nicht vorgesehen.
- Beziehungen sind nur sichtbar, wenn beide Endpunkte im Familienkontext sichtbar sind. Schreiben prüft auch die bisherigen Endpunkte; selbst der Familien-Owner darf keine verborgene Kante durch gezieltes Entfernen beschädigen. Bearbeiten nur als Kantenautor; Entfernen als Autor oder Owner. Andere Kanten werden nicht ersetzt.
- Mitgliedschaftstypen MEMBER_OF, LEADER_OF, FOUNDER_OF, FORMER_MEMBER_OF verlaufen CHARACTER → FACTION. Benutzerdefinierte Typen bleiben möglich. BEFORE ist EVENT → EVENT; TAKES_PLACE_AT und REFERENCES_PAST sind SCENE → EVENT im selben Projekt. TAKES_PLACE_AT bleibt auf eine Zuordnung je Szene beschränkt. Duplikatfehler verraten keine fremden Kanten-IDs oder Inhalte.
- Quellenbelege setzen Schreibrechte am Wissenseintrag und Besitz des Quellkapitels voraus. Geteilte Wissenseinträge teilen nicht automatisch fremde Romantexte. Lesen prüft Wissenseintrag, Kapitel und gegebenenfalls Szene. Eintrag und Quelle dürfen in unterschiedlichen eigenen Buchprojekten liegen; dies ersetzt kein Serienmodell.
- Jeder Beleg speichert Zitat und optionalen Kontext, optional eine vorhandene stabile Kommentar-ID, den Hash des Quellinhalts und den Kapitelstand. Es werden keine Zeichenoffsets als dauerhafte Anker gespeichert. JSON- und HTML-Kapitel werden unterstützt. Zitat und Kontext beziehen sich auf normalisierten Text (Whitespace zusammengefasst).
- Aktuelle Statuswerte: VALID, STALE, MISSING, AMBIGUOUS. Jede Inhaltsänderung markiert einen weiterhin eindeutigen Fund konservativ als STALE; Änderungen außerhalb des Zitats können deshalb ebenfalls Prüfbedarf erzeugen. Fehlende Kommentar-ID bedeutet MISSING, auch wenn das Zitat anderswo vorkommt. Keine automatische semantische Wahrheitsprüfung.
- Metadatenbearbeitung bestätigt keinen alten Textanker neu. Neuverankerung verlangt einen aktuellen `sourceExpectedUpdatedAt` und einen eindeutigen tatsächlichen Fund. Mehrere Belege je Aussage sind erlaubt.
- Kapitel-Löschung entfernt zugehörige Belege per FK; Szenen-Löschung entfernt nur die optionale Szenenzuordnung. Die vorhandene polymorphe Entitäts-Löschhilfe räumt auch Belege weg. Bestehende Einträge benötigen keine Belege und keine Datenübernahme.
- In der Oberfläche: Bearbeitungsdialog eines Charakters/Ortes/Items/einer Fraktion/einer Weltenregel → **Quellenbelege anzeigen und pflegen**. Dort Quellprojekt und Kapitel auswählen, tatsächlichen Text prüfen, Aussage und Zitat eingeben. Belege werden separat vom Hauptformular gespeichert. Fundstelle/Kontext, Änderungsstatus und erneute Bestätigung sind verfügbar.
- Bestehende Szenen-UI-Updates senden jetzt `expectedUpdatedAt`; die bestehende PUT-Route verlangt ihn. Externe direkte Nutzer dieser REST-Route müssen den Parameter ergänzen. Neue allgemeine Beziehungs- und Belegoperationen laufen über den gemeinsamen Service; die alten Beziehungs-UI-Operationen sind keine neue allgemeine Bulk-Undo-Funktion.
- MCP-Antworten sind weiterhin größenbeschränkt (256 KiB). Bei großen Listen `limit` reduzieren. Sehr große Einzelszenen mit sehr vielen Beziehungen können diese Grenze erreichen. Die Autorisierung wird vor Pagination angewandt; sehr große Beziehungs-/Belegkataloge werden derzeit im Service gefiltert, nicht mit Cursor-Pagination.

## Validierung

- Jest: 94 Suiten / 639 Tests bestanden. Drei vorhandene opt-in Datenbank-Suiten mit zehn Tests übersprungen (sie verlangen andere fest kodierte Test-Zugangsdaten).
- Neue Tests: tatsächliche und veraltete Zitate, Kontext-/Kommentaranker, Mehrdeutigkeit, fehlende Textstellen, Autoren-/Sichtbarkeitsrechte, fremde Endpunkte, OAuth-Lese-/Schreibrechte, Versionskonflikte, Szenenzuordnung, vollständige Sortierpermutation, gezielte Kantenänderungen, Quellenbeleg-Oberfläche.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: erfolgreich.
- `npm run build`: erfolgreich; vorhandene Sentry-Konfigurations-/Deprecation-Hinweise bleiben.
- `scripts/test-story-mcp-http.mjs`: 36 Prüfungen bestanden gegen echten lokalen PostgreSQL-Server, offizielles MCP-SDK und Session-HTTP-API. Enthält konkurrierende Schreibzugriffe (genau ein Gewinner), Mehrfachbelege und Schutz anderer Kanten. Sicherheitsprüfungen erzwingen Loopback, Testdatenbank/Ports und explizites Opt-in; Fixtures werden im finally-Block entfernt.
- Chromium-Browsertest: Quellenbeleg anlegen, Fundstelle anzeigen, nach Textänderung als veraltet erkennen, erneut bestätigen und entfernen; Desktop (1280 px) und Mobilansicht (390 px) visuell geprüft, keine Browserfehler.
- Additives Migrations-SQL auf isolierter bestehender Testdatenbank erfolgreich ausgeführt. Dort war `migrate deploy` wegen fehlender historischer Baseline nicht möglich (P3005); keine Baseline oder produktive Migration erfunden.
- Graphify-AST-Update erfolgreich; vorhandene Hinweise auf fehlenden SQL-Parser und zwei nicht interpretierte JSON-Konfigurationsdateien.

## Migration, Deployment, Verbindung

1. Bestehenden Datenbankstand sichern und Migrationstatus im Zielsystem prüfen. Neue Migration: `20261017210000_source_evidence`; nur neue Tabelle, Fremdschlüssel und Indizes, kein Backfill und keine Änderung vorhandener Texte.
2. Wie im Projekt üblich Image bauen (Prisma Client generieren, Next-Build). Ohne Docker im `frontend`: `npx prisma generate`, `npm run build`.
3. Im Zielsystem `npx prisma migrate deploy` ausführen; `docker-start.sh` führt dies bereits vor dem App-Start aus. Eine Datenbank ohne Prisma-Migrationshistorie muss zunächst anhand ihres tatsächlich vorhandenen Schemas regulär gebaselined werden; weder `reset` noch `db push` auf Nutzerdaten verwenden.
4. Anwendung neu starten. Smoke-Test mit einem ausdrücklich dafür vorgesehenen Testkonto/-projekt. Während dieser Aufgabe wurde nichts veröffentlicht oder auf produktive Systeme migriert.
5. MCP-URL bleibt `/api/integrations/mcp`. Werkzeugliste im verbundenen Client/Plugin aktualisieren bzw. Verbindung neu herstellen. Für Schreibzugriffe OAuth mit `mythos:read mythos:write` erneut autorisieren, falls bisher nur Lesen erlaubt war. Die Zustimmungstexte nennen jetzt auch Szenen, Beziehungen, Quellenbelege und deren gezieltes Entfernen. Bereits ausgestellte reine Lesetokens bleiben schreibgeschützt; vorhandene Schreibgrants ermöglichen die neuen Schreibwerkzeuge.
6. Testskript: ausschließlich mit `MYTHOS_RUN_MCP_INTEGRATION=1`, lokaler DB `mythos_integration_test` auf 55432, Redis auf 56379 und lokaler Issuer-URL `http://localhost:4000` starten. Testzugangsdaten nicht aus einer produktiven `.env` übernehmen.

## Zusätzlich geprüfte Funktionen (nicht neu gebaut)

| Funktion | Bestand | MCP | Nächster sinnvoller Schritt |
| --- | --- | --- | --- |
| Zeitleisten-Ereignisse anlegen/bearbeiten | Vorhanden: Modell, REST, Timeline-UI, Dauer/Kapitelzuordnung | Lesen über `mythos_timeline`; kein Anlegen/Bearbeiten | Bestehende Operationen mit Versionsschutz als Werkzeuge erschließen |
| Projektweite Suche mit Fundstellen | Vorhanden: `/api/search`, SearchModal; Kapitel und Wissensentitäten, Textausschnitte | Nicht erreichbar | Gemeinsamen Suchservice und paginierte Fundstellenwerkzeuge ergänzen |
| Kapitel anlegen/sortieren | Anlegen vorhanden; `order` im Modell und sortiertes Lesen. Keine vollständige Kapitel-Umsortierungsoperation gefunden | Lesen vorhanden, kein Anlegen/Sortieren | Kapitelanlage erschließen, atomare Sortierung mit Versionsschutz ergänzen |
| Erkannte Verknüpfungen gesammelt prüfen/bestätigen | Vorhanden: NameLinkingDialog, Vorschau/Auswahl für Figuren und Orte, Kapitel/Projektumfang, Versions-/Katalogschutz und Sicherungsentwurf | Nicht erreichbar | Bestehenden Vorschau-/Bestätigungsablauf erschließen |
| Versionsvergleich/Wiederherstellung | Benannte alternative Kapitelentwürfe, Umschalten und lokale Draft-Recovery vorhanden; Sicherungen bei Integrations-/Namenänderungen. Kein allgemeiner Text-Diff oder dedizierter Restore-Workflow gefunden | Nicht erreichbar | Sicheren Diff und explizites Wiederherstellen mit Sicherung ergänzen |
| Kontinuitätsprüfung mit Fundstellen | Teilweise: Chronologiewarnungen aus BEFORE/REFERENCES_PAST und Szenen-/Ereignisnamen; keine allgemeine inhaltliche Prüfung mit Textbelegen | Nicht erreichbar | Strukturierte Warnungen mit Quellenbelegen verbinden; keine erfundene Faktenprüfung |
| Welt-/Figuren-/Leserwissen je Kapitelstand | Kein entsprechendes zeit-/perspektivenabhängiges Wissensmodell gefunden | Fehlt | Fachmodell für Kenntnisstand und Enthüllungen zuerst definieren |
| Gemeinsames Serienwissen über Buchprojekte | Familie/Sichtbarkeit und optionale projectId vorhanden; kein Serienmodell oder vererbter Kanon | Fehlt als Serienfunktion | Serie/Kanon/Zugehörigkeit und Überschreibungsregeln definieren |
| Vorschau/Rücknahme von Sammeländerungen | Vorschau/Auswahl und Sicherungsentwürfe für Namen; Kapitelvorschläge mit Freigabe. Kein allgemeines Batch-Änderungsprotokoll oder atomarer Undo | Nicht allgemein erreichbar | Bestehende Sicherungen mit Diff/Restore verbinden, danach generische Batch-Protokolle |

Priorität: (1) bestehende Timeline-/Such-/Kapiteloperationen über MCP erschließen; (2) Diff/Wiederherstellung und nachvollziehbare Sammeländerungen; (3) Serienkanon und perspektivischen Kenntnisstand fachlich modellieren, danach beleggestützte Kontinuitätsprüfung.
