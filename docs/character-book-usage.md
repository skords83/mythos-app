# Charakteranzeige richtigstellen – 03.11.2026

Die vorbereitete lokale Korrektur in `bookCharacterCount` und beiden GET-Projektrouten
wurde übernommen. Remote-Branches und PRs wurden abgeglichen: kein offener PR für
diesen Punkt. Die bisherige Prisma-Relation `_count.characters` erfasste nur
`Character.projectId`, nicht gemeinsame Figuren mit `EntityUsage`.

Buchliste und Zähler verwenden denselben `bookEntityScope` und Sichtbarkeitsfilter:
lokale Figuren plus ausdrücklich verwendete Figuren desselben Universums. Gezählt
werden Character-Datensätze, keine Referenzen. `EntityUsage` hat zusätzlich einen
Unique-Key auf Typ, Identität und Buch; Zuordnen verwendet Upsert. Standalone-Bücher
bleiben auf ihre lokalen Figuren begrenzt.

Die Buchliste zeigt ihren vollständigen Buchumfang vor Rollenfiltern und führt direkt
zur Charakterauswahl des zugehörigen Universums. Die Universumsansicht zeigt ihren
separaten Umfang „Im Universum“ und je Buch den tatsächlichen Verwendungsstatus.
Nach Zuordnung/Lösen werden Verwendungen und Projektzähler neu geladen. Der Rückweg
ins Buch lädt Liste und Projekte erneut. Gemeinsame Figuren bieten keinen lokalen
Löschknopf. Lösen entfernt nur die Verwendung; vorhandene Abhängigkeiten bleiben
weiterhin geschützt. Keine Datenmigration und keine automatische Zuordnung.

## Vorhandene Daten

Produktive Datenprüfung offen: SSH zu dem konfigurierten Server odin
(10.99.1.11:2218) wurde abgelehnt (Connection refused). Daher keine Aussage darüber,
welche tatsächlichen Figuren fehlende Verwendungen haben. Keine produktiven Daten
geändert. Universumszugehörigkeit allein ist kein Beleg fehlender Buchverwendung.
Die bereits vorgesehene Übernahme lokaler Einträge erzeugt ausdrücklich eine
EntityUsage für das Ursprungsbuch; neue Universumseinträge tun dies bewusst nicht.
Textverknüpfungen/Quellen sind Hinweise zur manuellen Prüfung, keine automatische
Zuordnungsregel.

## Verifikation

- Regulärer Jest-Lauf: 107 Suites / 722 Tests erfolgreich; opt-in DB-Suites separat.
- TypeScript, Build und Lint erfolgreich (bestehende Lint-Warnungen).
- Browser-Test `frontend/scripts/test-character-usage.cjs`: isolierte API-Fixtures,
  Zuordnen/Lösen, Rückkehr zur Buchliste mit 0 → 1 → 0, Dashboardzähler,
  gemeinsame Identität bleibt auswählbar; Desktop und Mobil, Screenshots geprüft.
- Echter PostgreSQL-Test in `universe-service.db.test.ts` ergänzt: Universum ohne
  Verwendung, ein/zwei Bücher, wiederholtes Zuordnen, mehrere Textreferenzen,
  geschütztes Lösen bei Referenzen, Entfernen nach Bereinigung der Testreferenzen,
  Erhalt der Figur und Standalone-Buch. Wird im vorhandenen PR-CI ausgeführt.
