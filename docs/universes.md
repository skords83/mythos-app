# Universen – Integrationsmodell

## Entscheidung vor der Umsetzung (18.10.2026)

Eine gemeinsame Kontinuität je Universum; Universum → geordnete Buchprojekte.
Keine eigene Reihenverwaltung. Standalone-Projekte bleiben erhalten.
Character, Place, Item, Faction und LoreEntry bleiben die einzigen Wissensspeicher.
Ein optionaler universeId ersetzt bei gezielter Übernahme projectId; IDs bleiben
unverändert. EntityUsage verknüpft gemeinsame Identitäten ausdrücklich mit Büchern.
Relation und SourceEvidence bleiben erhalten; kein Manuskript wird umgeschrieben.
Universum verwendet vorhandene PRIVATE/FAMILY-Sichtbarkeit und Autorenschaft.
Buchrechte und Quellenrechte werden separat geprüft.

ContinuityAssertion ergänzt diese Identitäten um einzelne zeitliche Aussagen:
Eigenschaften, Besitz, Aufenthaltsort, Beziehungen, Mitgliedschaften und Figurenwissen.
Weltbehauptung, Figurenüberzeugung und Leserenthüllung werden getrennt gespeichert.
Erkenntnisstatus ist unabhängig von Gültigkeit. Anker referenzieren Bücher und optional
bestehende Kapitel, Szenen und TimelineEvent. Ereignisrelation BEFORE bestimmt
buchübergreifende zeitliche Vergleichbarkeit; Buchsortierung ist keine Chronologie.
Unvergleichbare Zustände bleiben unsicher; widersprüchliche Aussagen koexistieren.
Belege werden über die vorhandene SourceEvidence an Aussagen angehängt.

Gemeinsamer transaktionaler Service für HTTP und MCP; Serializable-Transaktionen,
Versionsschutz für Änderungen und Vorschau-Fingerprint für Übernahmen. Alte APIs
werden um ausdrücklich verwendete gemeinsame Einträge erweitert, nicht um alle
Einträge des Universums. Strukturänderungen prüfen Abhängigkeiten und Rechte.

## Spätere Optionen (nicht Bestandteil dieser Umsetzung)

- Alternative Zeitlinien und abweichende Kanonfassungen, mit expliziter
  Kontinuitäts-ID statt impliziter Kopien gemeinsamer Identitäten.
- Zusätzliche Buchreihenverwaltung innerhalb eines Universums.
- Automatische KI-Kontinuitätsprüfung; manuelle Widersprüche bleiben schon jetzt möglich.

Keine automatische Zuordnung oder Migration tatsächlicher Nutzerprojekte,
insbesondere nicht „Trolle nach Süden“. Entwicklung ausschließlich mit Testdaten.

## Bedienung und API-Semantik

Einstieg: **Dashboard → Universen**, außerdem direkt aus der Buchnavigation.
Die fünf bisherigen Wissenslisten enthalten lokale Einträge und explizit verwendete
Universumseinträge. In den bisherigen Editoren ist deren Geltungsbereich sichtbar;
gemeinsame Korrekturen führen zur versionierten Universumsansicht.

- Universumsautor verwaltet Universum, Buchzuordnung und Reihenfolge. Buchzuordnung
  erfordert zusätzlich Buchbesitz. Keine neuen Mitglieder oder Manuskriptfreigaben.
- PRIVATE/FAMILY gilt separat für Universum und Einträge. Eine Übernahme erhält
  Autor, Sichtbarkeit, IDs, Aliase, Bilder, gerichtete Beziehungen und Quellen.
- Übernahmevorschau umfasst den einzelnen Eintrag, Beziehungen, aktuelle und
  gespeicherte Kapitel-Textverknüpfungen, zugängliche Quellen und Namensduplikate.
  Ein SHA-256-Fingerprint schützt die Vorschau; keine Namenszusammenführung.
- Schreiboperationen laufen mit Serializable-Isolation. `expectedUpdatedAt` ist
  exakt der zuletzt gelesene ISO-Zeitstempel. 409 verlangt erneutes Lesen/Prüfen.
- Ausgelassene Felder bleiben unverändert. Optionale Textfelder werden mit `null`
  geleert. `endsAt`, `revealedAt`, `observerId`, `relationId`: `null` entfernt die
  Zuordnung. `evidenceIds: []` leert die Quellenzuordnung, nicht die Quellen.
  `remove: true` hebt eine Buchverwendung nur ohne Abhängigkeiten auf.
- Listen: `page` ab 1, `limit` 1–100 (Standard 50), Antwort enthält `entries`,
  `page`, `limit`, `total`, `hasMore`; stabile Sortierung mit ID als Tie-Breaker.
- Allgemeine Eintragsfelder sind ausdrücklich **Autorenangaben**. Zeitabhängige
  Tatsachen und Enthüllungen gehören in Aussagen, nicht in diese Grundangaben.
- `startsAt` ist erforderlich; Anker enthält `projectId` und optional `chapterId`,
  `sceneId`, `eventId`. `endsAt` ist exklusiv. Buch-/Kapitel-/Szenenreihenfolge
  bestimmt nur Leserenthüllungen, niemals die zeitliche Wahrheit einer Aussage.
- Für buchübergreifende zeitliche Vergleiche vorhandene Ereignisse über gerichtete
  `BEFORE`-Beziehungen verbinden. Ohne beweisbare Ordnung: `UNKNOWN`. Bei Zyklen
  ebenfalls keine sichere Ordnung. Identische Anker sind vergleichbar.
- `WORLD` und `BELIEF` sind getrennt; BELIEF benötigt eine sichtbare Figur.
  `CONFIRMED`, `SUSPECTED`, `DISPUTED`, `REJECTED` beschreiben Erkenntnisstatus,
  nicht Gültigkeit. „Aktiv“ bedeutet zeitlich gültig, nicht automatisch wahr.
- `view: reader` filtert unbekannte/spätere Enthüllungen, `character` verlangt
  `observerId` und liefert sicher gültige Figurenüberzeugungen. Beide benötigen
  `at`. `author` zeigt ausdrücklich alle zugänglichen Aussagen; `at` ist optional.
  Widersprüche bleiben als Einzelaussagen und in `contradictions` erhalten.
- Private Quellen werden vollständig ausgelassen, inklusive Beleg-ID, Zitat,
  Kapitelname und Textanker. Nicht zugängliche Gültigkeitsanker erscheinen nur
  als `{ restricted: true }`. Quellenstatus wird weiter am aktuellen Text ermittelt.
- Buchentfernung löscht keine Inhalte. Verwendungen, Aussagen, Quellen,
  Textverknüpfungen und gemeinsame Beziehungen können das Lösen verhindern.
  Polymorphe Kontinuitätsreferenzen sind zusätzlich durch DB-Löschtrigger geschützt.

## MCP-Werkzeuge

Alle Werkzeuge tragen das Präfix `mythos_`:

| Bereich | Werkzeuge |
| --- | --- |
| Universen | `universes`, `universe`, `create_universe`, `update_universe` |
| Bücher | `universe_books`, `create_universe_book`, `attach_universe_book`, `detach_universe_book`, `reorder_universe_books` |
| Gemeinsame Identitäten | `universe_entries`, `universe_entry`, `create_universe_entry`, `update_universe_entry`, `use_universe_entry` |
| Übernahme | `preview_universe_promotion`, `promote_universe_entry` |
| Handlungsanker | `create_universe_event`, `update_universe_event` |
| Aussagen und Wissen | `universe_assertions`, `create_universe_assertion`, `update_universe_assertion`, `delete_universe_assertion` |

Weiterverwendet: `relations`, `create_relation`, `update_relation`, `delete_relation`
sowie `evidence`, `create_evidence`, `update_evidence`, `delete_evidence`.
`create_relation` erlaubt BEFORE zwischen eigenen Büchern desselben Universums.
Bestehende buchbezogene Lese-Werkzeuge liefern nur lokale und ausdrücklich
verwendete gemeinsame Identitäten; niemals automatisch das ganze Universum.

Alle 22 neuen Werkzeuge sind im MCP-`tools/list` registriert, mit Eingabeschema,
Annotationen und OAuth-Metadaten. Lesen: `mythos:read`; Schreiben zusätzlich
`mythos:write`. Der gemeinsame Service prüft unabhängig davon die Autorenrechte.
HTTP verwendet dieselben Aktionen über `POST /api/story` mit `{ action, args }`.

## Migration und Deployment

Migration: `frontend/prisma/migrations/20261018080000_universes/migration.sql`.
Sie ergänzt Tabellen/FKs/Indizes, nullable Universumsfelder und Löschschutz.
Es gibt **keine Datenübernahme und keine Zuordnung bestehender Nutzerprojekte**.

Für eine bestehende, migrationsverwaltete Installation:

1. Datenbankbackup erstellen und Wiederherstellbarkeit sicherstellen.
2. Diesen Stand prüfen/committen und das neue Anwendungsimage über den bestehenden
   Build-/Releaseprozess bauen. Prisma-Client muss aus dem neuen Schema entstehen.
3. Im Deploymentverzeichnis `docker compose pull app` ausführen, nachdem das neue
   Image veröffentlicht ist. `latest` darf erst dann verwendet werden; alternativ
   ein geprüfter fester Image-Digest im Compose-Override.
4. `docker compose up -d --no-deps app`. Der bestehende `docker-start.sh` führt
   **vor** dem Serverstart `prisma migrate deploy` aus und bricht bei Fehlern ab.
5. `docker compose logs --tail=100 app` und `docker compose ps app` prüfen;
   `GET /api/health` muss erfolgreich sein. Danach `/universes` und MCP `tools/list`
   prüfen. Produktive Bücher werden nicht als Deployment-Test verwendet.

Ohne Docker, im Verzeichnis `frontend` mit korrekt gesetzter Zielkonfiguration:
`npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`;
anschließend den bisherigen Prozessmanager mit dem neuen Build neu starten.
Kein `db push`, `migrate reset` oder Test-Seeding gegen Produktionsdaten.

Die historischen Migrationen enthalten keine ursprüngliche Baseline. Eine leere
Testdatenbank wird deshalb aus dem bisherigen Prisma-Schema initialisiert; danach
wird exakt diese neue SQL-Migration angewandt. Für bestehende produktive Datenbanken
keinesfalls eigenmächtig Migrationen als angewandt markieren.

Die Migration ist additiv. Kein automatisches Schema-Downgrade: Ein alter Server
kennt gemeinsame Verwendungen nicht. Nach Nutzung der Funktion darf ein Rollback
nicht allein durch Starten eines alten Images erfolgen; vorher Zustand/Backup prüfen.

## Gespeicherte MCP-Werkzeugliste aktualisieren

1. Nach dem Deployment die vorhandene Verbindung zu `/api/integrations/mcp` im
   verwendeten MCP-Client aktualisieren/neu verbinden, damit erneut `tools/list`
   geladen wird. Es gibt keinen zusätzlichen serverseitigen Werkzeuglisten-Cache.
2. Prüfen, dass beispielsweise `mythos_universes`, `mythos_promote_universe_entry`
   und `mythos_universe_assertions` in der gespeicherten Liste stehen.
3. Ist bisher nur Lesen freigegeben, die Verbindung mit
   `mythos:read mythos:write` neu autorisieren. Vorhandene Schreibgrants bleiben
   gültig; Lesetokens können weiterhin keine Universen verändern.
4. Erst lesend `mythos_universes` aufrufen. Eine neue Verbindung vergibt keine
   Buchrechte und übernimmt keine bestehenden Inhalte.

## „Trolle nach Süden“ später bewusst übernehmen

1. Als Besitzer des Buchs **Universen → Neues Universum** öffnen, einen selbst
   gewählten Titel/Beschreibung und die gewünschte Sichtbarkeit speichern.
2. Unter **Vorhandenes Buch** „Trolle nach Süden“ auswählen und **Buch zuordnen**.
   Hierdurch werden noch keine Figuren, Orte oder Gegenstände übernommen.
3. Den gewünschten Eintragstyp wählen. Unter **Lokalen Eintrag übernehmen** das
   Buch und genau einen bestehenden Eintrag wählen, dann **Übernahme prüfen**.
4. Beziehungen, Textverknüpfungen, Quellen und mögliche Namensduplikate prüfen.
   Erst mit **Diesen Eintrag übernehmen** wird die bestehende ID gemeinsam.
5. Weitere Bücher ausdrücklich zuordnen. Beim gemeinsamen Eintrag unter
   **Verwendung in Büchern** die gewünschten Bücher auswählen.
6. Allgemeine Korrekturen oben speichern; neue Handlungsentwicklungen unten
   getrennt anlegen. Besitzerwechsel, Wissen und Enthüllungen nur anhand der
   tatsächlich vorhandenen Geschichte eintragen; bei Bedarf Ereignisse über
   **Handlungszeit verbinden** zeitlich ordnen. Es wurden keine Trollinhalte erfunden.

## Bewusste Grenzen

Keine alternativen Kontinuitäten, zusätzliche Reihenverwaltung oder automatische
KI-Prüfung. Chronologie ist eine manuell gepflegte partielle Ordnung, kein Kalender.
Widersprüche werden angezeigt, nicht automatisch aufgelöst. Universen verwenden
vorhandene Familienfreigaben; keine neue Kollaborations-/Einladungsverwaltung.
Gemeinsame Identitäten werden nicht über alte, unversionierte Einzel-Editoren gelöscht.
Die Oberfläche zeigt nur zugängliche Buchverwendungen; private Buchmetadaten bleiben
auch dann verborgen, wenn der gemeinsame Eintrag für die Familie sichtbar ist.

## Abnahme (isoliert, 18.10.2026)

- Regulärer Jest-Lauf: 95 Suites, 645 bestandene Tests; die separat aktivierbaren
  Datenbank-Suites werden im normalen Lauf übersprungen.
- Universums-Integrationstests mit echtem PostgreSQL: 10 Tests. Abgedeckt sind
  unveränderte Standalone-Projekte, ausdrückliche Zuordnung, stabile Identität in
  zwei Büchern, Quellen-/Text-/Beziehungserhalt, Namensduplikate, Versionskonflikte,
  Rollback nach begonnener Übernahme, zeitliche Zustände und unbekannte Ordnung,
  Welt-/Figuren-/Leserwissen, private Quellen, Fremduniversumsreferenzen,
  kontrolliertes Lösen und versionierte Ereignis-/Aussagenpflege.
- MCP-Registry und Read-/Write-Berechtigungen sind Bestandteil des Jest-Laufs.
- `tsc --noEmit --incremental false`, `npm run build`, `git diff --check`.
- Browser-Abnahme mit Chromium: Anlegen/Bearbeiten, Buchzuordnung, Übernahme,
  neues Buch, gemeinsame Verwendung, Korrektur, Entwicklung, Leserstand,
  verweigerte Buchentfernung; Desktop 1280×950 und Mobil 390×844, ohne JS-Fehler
  oder horizontales Überlaufen. Screenshots wurden visuell geprüft.
- Die neue SQL-Migration wurde auf dem bisherigen Schema in einem separaten
  lokalen Testschema angewandt. Keine produktive Migration und kein Deployment.

Reproduzierbare Testdateien: `universe-time.test.ts`, `universe-service.db.test.ts`,
ergänzte MCP-/API-Tests sowie `scripts/test-universe-ui.cjs`.
Der DB-Test verlangt ausdrücklich `MYTHOS_RUN_UNIVERSE_TEST=1` und eine lokale
Test-URL mit Datenbank `mythos_integration_test`, Port 55432, Schema
`universe_acceptance`. Zugangsdaten kommen ausschließlich aus der Umgebung.
Der Browser-Test verwendet denselben Schutz, `JWT_SECRET`, optional
`MYTHOS_UI_TEST_ORIGIN` (Standard `http://127.0.0.1:4012`),
`MYTHOS_PLAYWRIGHT_MODULE` und `MYTHOS_CHROMIUM_PATH`. Er legt nur eigene Fixtures
an und entfernt diese anschließend. Playwright/Chromium sind Testwerkzeuge,
keine zusätzlichen Produktionsabhängigkeiten.
