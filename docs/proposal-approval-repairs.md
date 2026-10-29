# Kapitelvorschläge und verwaiste Verknüpfungen

Die vorhandenen `ChapterProposal`-Datensätze bleiben die einzige Vorschlagsverwaltung.
Erstellung, erneutes Einreichen und Übernahme verwenden dieselbe Formatvalidierung
(`validateChapterProposal` / `proposalToChapterHtml`). Nicht unterstützte Tiptap-Knoten
werden bereits bei der Erstellung abgewiesen. Bestehende Mentions und Kommentaranker
in HTML, HTML-Wrappern und Tiptap-JSON bleiben geschützt; `{}` und `null` gelten als
leere Kapitel. Unbekannte Inhaltsformate werden weiterhin vorsichtig behandelt.

## Abgelaufene Vorschläge

In `/integrations/approvals` können abgelaufene `PENDING`- oder `EXPIRED`-Vorschläge
abgelehnt werden. „Erneut einreichen“ verlängert denselben Datensatz um 24 Stunden,
sofern Kapitelrevision, Formatvalidierung und Schutzprüfung weiterhin passen.
Dabei wird kein Kapitel geändert. Eine spätere ausdrückliche Freigabe ist notwendig.
Bereits abgelehnte oder übernommene Vorschläge können nicht reaktiviert werden.
Die Entscheidungen bleiben Session- und Same-Origin-geschützt; OAuth erteilt keine Freigabe.

## Verknüpfungen reparieren

Die Freigabeseite verlinkt `/integrations/references`. Nach Kapitelauswahl werden
verwaiste Figuren-, Orts-, Gegenstands- und Kommentaranker aufgelistet. „Verwaist“
bedeutet: Das Ziel fehlt im zulässigen Familien-/Kapitelkontext. Vorhandene, aber
private oder nicht dem Buch zugeordnete Ziele gelten als nicht verfügbar und werden
weder als verwaist angeboten noch verändert. Ihre Namen und Inhalte werden nicht offengelegt.
Reparaturziele kommen aus demselben Buchkontext, Kommentare aus demselben Kapitel.
Nur eigene Kapitel dürfen bearbeitet werden.

Eine Änderung betrifft genau einen gewählten Anker und prüft vorher die geladene
Kapitelrevision. HTML-Änderungen ersetzen ausschließlich die betroffenen Attribute
anhand von Parser-Quellpositionen; Text, Entities und umgebendes Markup bleiben
unverändert. JSON-Mentions werden beim Entfernen zu ihrem sichtbaren `@Label`-Text,
Kommentar-Marks werden ohne ihren Text entfernt. Jede Änderung sichert die vorherige
Fassung über die vorhandenen Kapitelversionen. Gültige Verknüpfungen werden über
diese Verwaltungsoberfläche nicht gelöscht.

## Leseansichten und Grenzen

Originaltext, vorgeschlagener Text und Textvergleich stehen ohne Textkürzung in
einer breiten, einspaltigen Leseansicht bereit. Der Vergleich markiert den gesamten
geänderten Bereich zwischen gemeinsamem Anfang und Ende. Er ist ein Vergleich des
sichtbaren Textes, kein Vergleich einzelner Formatierungsmerkmale.

Ältere Vorschläge speichern keinen Snapshot des ursprünglichen Kapiteltextes.
Bei unveränderter Revision ist die aktuelle Fassung der Originaltext; nach einem
Konflikt wird die aktuelle Fassung mit entsprechendem Hinweis angezeigt. Eine
historische Ausgangsfassung wird nicht rekonstruiert oder als Original ausgegeben.
Bestehende Vorschläge mit früher akzeptierten, inzwischen als nicht unterstützt
erkannten Formaten müssen neu erstellt werden; sie können weiterhin verworfen werden.

## Lokale Prüfung

Im Verzeichnis `frontend`:

- `npx prisma generate` aktualisiert ausschließlich den lokalen Client.
- `npm test -- --runInBand` führt die Regressionstests aus.
- `npm run lint` verwendet die eingecheckte Next.js-ESLint-Konfiguration.
  Bestehende stilistische Text-Escaping-Befunde bleiben Warnungen.
- `npm run build` benötigt Netzwerkzugriff für die bestehenden Google Fonts.

Die PostgreSQL-Tests bleiben standardmäßig deaktiviert. Ihr expliziter Opt-in
`MYTHOS_RUN_DB_INTEGRATION=1` erfordert die im Test fest definierte isolierte
Testdatenbank; sie dürfen nicht gegen Produktionsdatenbanken ausgeführt werden.

## Zusätzliche Integritätsprüfung von PR #4

- Alle 20 zuvor deaktivierten PostgreSQL-Tests wurden in einem neu gestarteten,
  flüchtigen lokalen PostgreSQL-16-Container ausgeführt: 10 Kapiteltests im Schema
  `public`, 10 Universumstests im Schema `universe_acceptance`.
- Zusätzliche echte DB-Tests prüfen konkurrierendes Autosave/Freigabe, genau einen
  erfolgreichen Schreiber, atomare Versionssicherung, Rollback bei Sicherungsfehlern,
  geschützte private Ziele, Revisionskonflikte und ältere/abgelaufene Vorschläge.
- Kapitel-PUT verlangt jetzt immer einen kanonischen `expectedUpdatedAt`-Wert.
  Die vorhandene Oberfläche sendet ihn bereits; alte Clients ohne Revision erhalten
  HTTP 400. Autosave, Freigabe und Referenzreparatur erhöhen die Revision monoton,
  auch wenn mehrere Schreibversuche in derselben Millisekunde erfolgen. Auch die
  vorhandene Namen-Verknüpfung und interne Kapitel-Ersetzung erhöhen die Revision.
- Serialisierungsfehler und verlorene Revisionsvergleiche liefern HTTP 409;
  Kapitel, Vorschlagsstatus und Sicherung bleiben transaktional konsistent.
- Nicht unterstützte Vorschlagsfelder werden abgewiesen, statt beim Rendern
  stillschweigend entfernt zu werden. Auch ältere solche Vorschläge bleiben verwerfbar.
- Fehlerhafte Entity-Marker ohne gültigen Typ werden als `UNKNOWN` erkannt.
  Vorhandene Ziele bleiben geschützt; fehlt das Ziel, ist gezieltes Entfernen
  möglich. Ein neues typisiertes Ziel kann anschließend im Editor verknüpft werden.
- `.github/workflows/pr-checks.yml` ergänzt PR-Prüfungen für Lint, Unit-Tests,
  Build und isolierte PostgreSQL-Tests. Dieser Workflow veröffentlicht keine Images.
  Der vorhandene Veröffentlichungsworkflow für `main` wurde nicht verändert.

Bei Kommentarreparaturen wird auch der im Anker gespeicherte Erledigt-Status mit
dem neuen Ziel synchronisiert. HTML-Wrapper-Metadaten bleiben bei der Freigabe erhalten.
