# Erkannte Namen verknüpfen

Die Aktion steht im Manuskript oberhalb des Editors, direkt unter der Entwurfsauswahl. Sie verarbeitet das Original eines Kapitels oder alle Originalkapitel des Projekts. Bei einem geöffneten alternativen Entwurf zuerst zum Original wechseln; eine ausstehende lokale Entwurfswiederherstellung zuerst klären.

1. „Erkannte Namen verknüpfen“ öffnen. Ungespeicherte Eingaben werden zunächst mit Versionsprüfung gespeichert. Während des Dialogs bleibt der Editor gesperrt und Autosave pausiert.
2. Aktuelles Kapitel oder gesamtes Projekt wählen, Figuren und/oder Orte auswählen und die Vorschau erstellen.
3. Die Vorschau gruppiert eindeutige Treffer nach Eintrag. Nicht gewünschte Einträge abwählen. Mehrdeutige Fundstellen erscheinen gesondert und werden nicht übernommen, auch wenn der konkurrierende Eintrag einem abgewählten Typ angehört.
4. Ausgewählte Treffer verknüpfen. Die Ergebnisliste nennt jedes Kapitel, ergänzte und übersprungene Fundstellen sowie Fehler oder zwischenzeitliche Änderungen.

Pro geändertem Kapitel wird atomar ein Entwurf „Vor Namen-Verknüpfung …“ mit dem bisherigen Inhalt gespeichert. Diese Sicherung ist über die vorhandene Entwurfsauswahl lesbar. Bei Netzwerkfehlern kann das Ergebnis unbestätigt sein: Kapitel neu laden und die Vorschau erneut erstellen. Bereits vorhandene Verknüpfungen werden nicht doppelt angelegt.

Die gemeinsame Erkennung verwendet unverändert mindestens drei Zeichen, Unicode-Wortgrenzen, Namen und hinterlegte Aliase sowie Groß-/Kleinschreibungsunabhängigkeit. Sie erfindet keine Beugungen: „Fabians“ wird nur erkannt, wenn diese Form hinterlegt ist; die gefundene Schreibweise bleibt als Mention-Label erhalten. Überschneidungen verschiedener Einträge, einschließlich Objekt-Aliasen, sind mehrdeutig. Die Sammelfunktion hat keine Beschränkung auf die maximal 40 gleichzeitig sichtbaren Editorvorschläge.

Technik: `nameRecognition.ts` teilt die Erkennung mit den passiven Editordekorationen. `bulkNameLinks.ts` bearbeitet ausschließlich passende HTML-Textknoten und erhält umgebende Formatierungen, Kommentare, Bilder und vorhandene Mention-Knoten. `/api/name-links` prüft Projekteigentum, Namenskatalog-Fingerprint und Kapitelversion. Anwendung und Sicherung erfolgen je Kapitel in einer serialisierbaren Transaktion. Normale Editor-Speichervorgänge nutzen ebenfalls eine Versionsprüfung, damit veraltete offene Editoren Sammeländerungen nicht überschreiben.
