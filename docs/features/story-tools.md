# Vernetzte Story-Werkzeuge

## Bedienung

- **Story Explorer:** Im Editor einen `@`-Verweis anklicken oder „Story Explorer und Referenzen“ in der Werkzeugleiste öffnen. Profile, vorhandene Beziehungen, Orte und verknüpfte Szenen stehen neben dem Text. „Alle Vorkommen im Manuskript“ durchsucht alle Kapitel einschließlich Aliasnamen; Fundstellen öffnen das zugehörige Kapitel. „Letzte Erwähnungen“ meint die letzten Stellen in Manuskriptreihenfolge. Die bisherige Referenzansicht ist zusätzlich aufklappbar.
- **Aliase und Namensvorschläge:** Aliase im Explorer oder beim Bearbeiten einer Figur, eines Ortes oder Items speichern (ein Name pro Zeile). Die automatische Verknüpfung erhält den geschriebenen Namen. Mehrdeutige Aliase werden nicht passiv verknüpft. Unter „Namen entdecken“ stehen wiederholte unbekannte, großgeschriebene Wörter ab drei Vorkommen; der Autor entscheidet zwischen Charakter, Ort, Item und Ignorieren. Das ist eine Heuristik und kann gewöhnliche Substantive vorschlagen. Ignorieren gilt für die geöffnete Explorer-Ansicht.
- **Timeline:** In „Story-Planung“ Ereignisse über „liegt vor“ verbinden, Szenen einem Zeitpunkt zuordnen oder ausdrücklich mit vergangenen Ereignissen verknüpfen. Im Ereigniseditor sind Kapitel, Dauer und chronologische Position einstellbar. Die Prüfung meldet Widersprüche dieser expliziten Angaben; Freitextdaten werden nicht als reale Kalenderdaten interpretiert. Eine Szene benötigt für die Prüfung vergangener Verweise einen zugeordneten Zeitpunkt. Rückblenden erhalten ihren eigenen Zeitpunkt.
- **Statistik:** Optionales Gesamtwortziel, heutige Schreibsessions, Manuskriptwachstum und Kapitelvergleich. Sessions erfassen die Nettoänderung im Hauptmanuskript; Löschungen können negative Werte ergeben. Schreibzeit summiert die Zeit zwischen Eingaben (höchstens 30 Sekunden je Abstand); ab fünf Minuten Pause oder am Tageswechsel beginnt eine neue Session. Versteckte Tabs und programmgesteuertes Laden zählen nicht. Der Tagesverlauf enthält tatsächlich gespeicherte Wortstände, keine aus alten Tageszielen rekonstruierten Werte. Historische Sessionzeiten und Kapitelstände lassen sich nicht nachträglich bestimmen.

## Datenbank und Inbetriebnahme

Die additive Migration `20260915120000_story_tools` ergänzt Aliase, das Projektgesamtziel, Kapitelzuordnung/Dauer für Ereignisse sowie Tabellen für Sessions und tägliche Manuskriptstände. Vor dem Start der neuen Version im jeweiligen Zielsystem mit dem vorhandenen Prisma-Migrationsverfahren anwenden:

```sh
cd frontend
npx prisma migrate deploy
npx prisma generate
```

In dieser Entwicklungssitzung wurde keine Migration gegen eine laufende Datenbank ausgeführt. Beim regulären Docker-Start führt das vorhandene `docker-start.sh` die Migration automatisch aus. Eine vollständige Browserprüfung mit migrierter Datenbank gehört zur Inbetriebnahme.
