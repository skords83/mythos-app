# Formulare und Aktualisierung zuverlässig machen – Punkt 2

Aufbauend auf den integrierten PRs #9 (Buchverwendung), #10 und #11 (MCP).
Keine Änderung an produktiven Inhalten, Datenmodellen oder MCP-Schreibregeln.
Die bereits vorhandene, unversionierte funktionale Bestandsaufnahme wurde gelesen,
aber nicht in diesen Änderungssatz aufgenommen. Editorfeld-Vervollständigung und
Kontinuitätskonflikt-Darstellung bleiben getrennte Folgeaufgaben.

## Ursachen und Korrekturen

- Der Universumseditor setzte nur Teile des Zustands zurück. Gemeinsame Resets
  leeren jetzt Entwurf, Sichtbarkeit, Verwendungen, Aussagenbearbeitung,
  Quellenauswahl, Abfrageanker und abhängige Auswahlen. Typ-, Eintrags- und
  Universumswechsel können keine vorherigen Werte in neue Schreibpayloads tragen.
  Beziehungen und Quellenbelege werden mit der vollständigen Eintragsidentität
  neu gemountet; Abbruch der Beziehungskorrektur leert deren Entwurf.
- Unabgeschlossene Leseanfragen konnten neuere Auswahlen überschreiben.
  Anfrageversionen beziehungsweise Effect-Cleanup schützen Initialisierung,
  Universum, Eintrag, lokale Auswahl, Aussagen, Kapitel, Ereignisse und Szenen.
  Wiederholungen bleiben beim jeweiligen Datenabruf, ohne Seitenreload.
- Ungespeicherte Eingaben erhalten bei Kontextwechseln einen Verwerfen-Dialog
  mit der vorhandenen ConfirmDialog-Komponente. Speichern einer Figur oder
  Ändern ihrer Buchverwendung setzt parallele Aussagenentwürfe nicht zurück.
- Die separate Figurenliste für Wissensauswahlen wurde nicht aktualisiert;
  sie wird jetzt zusammen mit der Eintragsliste nachgeladen. Aussagen werden
  auch in der Autorenansicht ohne Abfrageanker nach Änderungen aktualisiert.
  Speichern aktualisiert die gewählte Identität samt Versionsstand.
  Buchverwendungsumfang und Universumsumfang bleiben ausdrücklich getrennt;
  die bestehende Projektzähler-Aktualisierung bleibt bestehen.
- Handlungsanker lasen nur die erste Kapitelseite. Die ausgegliederte Anchor-
  Komponente lädt alle Metadatenseiten in der Reihenfolge des vorhandenen
  Kapitelendpunkts (order/id), ohne Kapiteltext. Buchwechsel löschen abhängige
  IDs; bestehende gültige IDs bleiben beim Bearbeiten erhalten. Nicht auflösbare
  IDs werden sichtbar beibehalten; eingeschränkt sichtbare Anker werden bei
  Korrekturen ausgelassen statt versehentlich gelöscht.
- Verschluckte Fehler und vermeintliche Leerzustände sind durch Ladeanzeigen,
  Fehlermeldungen und gezielte Wiederholung ersetzt. Fehlgeschlagene Speicherung
  erhält Eingaben; Erfolg erscheint erst nach bestätigtem Schreibaufruf.
  Synchrone Sperren verhindern doppelte Schreibanfragen.

## Verifikation

- `universes/__tests__/reliability.test.tsx`: A/B/Neu, Typ- und Universumswechsel,
  Verwerfen/Abbrechen, verspätete Eintrags-/Universums-/Kapitelantworten,
  Figurenanlage/-korrektur und Wissensauswahl, Aussagen ohne Abfrageanker,
  Bearbeiten/Neu, getrennte Entwürfe, doppelte Schreibversuche,
  Speicherfehler, Ladefehler/Wiederholung, Kapitel nach der ersten Seite,
  Buchisolierung und nicht auflösbare Zuordnungen.
- Quellenbeleg-Regression: Ladefehler ist kein Leerzustand, Wiederholung lädt
  die tatsächlichen Belege. Bestehende Quellen- und Universumstests bleiben aktiv.
- Regulärer Jest-Gesamtlauf, TypeScript, Lint/Build und `git diff --check`.
  Die opt-in Datenbank-/MCP-Suites laufen im vorhandenen PR-CI; lokal werden
  ausschließlich isolierte HTTP-Fixtures für die Oberflächenprüfung verwendet.
- `frontend/scripts/test-universe-forms.cjs`: echter Chromium-Browser mit
  abgefangenen API-Zugriffen, Fehler-/Erfolgsabläufe, schnelle Auswahlwechsel,
  Aussagen anlegen/korrigieren, Kapitel 101 und Buchwechsel, Wiederholung,
  Desktop/Mobil und horizontale Überlaufprüfung. Screenshots lokal unter
  `/tmp/mythos-form-reliability/`, visuell geprüft.
- Bestehender Browser-Test `test-character-usage.cjs` erneut erfolgreich:
  Zuordnen/Lösen, Buchliste und Dashboardzähler 0 → 1 → 0, Identität bleibt bestehen.
- Wissensgraph gemäß `CLAUDE.md` mit `graphify update .` aktualisiert.
