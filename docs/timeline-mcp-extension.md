# Timeline-Schreibzugriff über MCP

Lokal implementiert und geprüft am 18.10.2026; nicht deployt und nicht in einer produktiven ChatGPT-Verbindung freigegeben.

## Modell und Umfang

Die vorhandene Prisma-Entität `TimelineEvent` bleibt die einzige Ereignisstruktur. Sie enthält Titel, optionale Beschreibung, freie Datums- und Dauertexte, manuelle `order`, Typ PLOT/LORE, PRIVATE/FAMILY, Projekt, Familie, Autor und optionales Kapitel. Keine direkte Universumszuordnung: diese ergibt sich aus dem Projekt. Szenen werden über Beziehungen zugeordnet. Kein Kalenderzwang und keine Migration: `date: "am nächsten Morgen"`, ungefähre Angaben und undatierte Ereignisse sind bereits möglich. Freie Datumsangaben werden nicht automatisch chronologisch interpretiert.

MCP-Schreiben ist wie bei den bestehenden Entitätswerkzeugen auf eigene Projekte begrenzt. Bibliotheksereignisse ohne Projekt sind nicht Gegenstand dieser Werkzeuge. Bearbeiten verlangt Autorenschaft; Löschen erlaubt zusätzlich den Familien-Owner, jedoch nur bei sichtbarem Ereignis in seinem eigenen Projekt. Die Web-Endpunkte und deren Familienregeln bleiben unverändert.

## Eingaben und Antworten

Alle neuen Werkzeuge benötigen OAuth `mythos:read mythos:write`. Unbekannte Eingaben werden abgelehnt. IDs maximal 128 Zeichen, Versionsangaben als ISO-Zeitstempel.

| Werkzeug | Pflichtfelder | Weitere Felder |
| --- | --- | --- |
| `mythos_create_event` | `projectId`, `title` | `description`, `date`, `duration`, `chapterId`, `order`, `type`, `visibility` |
| `mythos_update_event` | `projectId`, `id`, `expectedUpdatedAt` | dieselben Inhaltsfelder wie create |
| `mythos_delete_event` | `projectId`, `id`, `expectedUpdatedAt` | keine |
| `mythos_reorder_events` | `projectId`, `events` | `events: [{id, expectedUpdatedAt}, …]` |

Titel: nicht leer, maximal 300 Zeichen; Beschreibung/Datum: maximal 20000; Dauer: maximal 100; order: ganze Zahl 0–1000000. Typ PLOT/LORE, Sichtbarkeit PRIVATE/FAMILY. Anlegen ohne Position hängt hinter der höchsten Position an, Standard PLOT/PRIVATE. Identische Titel erzeugen verschiedene IDs.

Updates bewahren ausgelassene Felder. `description`, `date`, `duration`: `null` oder `""` leert; `chapterId:null` entfernt die Zuordnung. Kapitel müssen zum angegebenen Projekt gehören. Projekt, Familie und Autor können nicht geändert werden.

Create/Update liefern `{status, data: <vollständiges Ereignis>}` einschließlich `id` und `updatedAt`; Delete `{status:200,data:{deleted:id}}`; Reorder `{status:200,data:{entries:[…]}}`. Fehler folgen dem Story-Service: 400 Validierung, 403 Rechte, 404 nicht gefunden/zugänglich, 409 Versions-/Abhängigkeitskonflikt.

Sortierung umfasst **alle** Ereignisse eines Projekts, PLOT und LORE gemeinsam, maximal 1000. Vollständige eindeutige Permutation, ausschließlich eigene Einträge und aktuelle Versionen sind erforderlich. Positionen werden 0 bis n−1. Verborgene/fremde Ereignisse verhindern die Sortierung. Kein Datum wird geändert.

`mythos_timeline(projectId,page?,limit?)` behält sein Arrayformat und Pagination (Standard 50, maximal 100). Alle bisherigen Modellfelder bleiben enthalten; sichtbare `relations` kommen hinzu. Stabile Sortierung nach order und ID. Quellenbelege separat über `mythos_evidence(entityType:"EVENT",entityId,…)` lesen.

## Beziehungen, Belege, Transaktionen

Bestehende create/update/delete_relation und evidence-Werkzeuge unterstützen EVENT. Figuren, Orte, Items, Fraktionen und Hintergrundwissen bleiben eigenständige Entitäten. Szenenverknüpfungen: SCENE → EVENT mit TAKES_PLACE_AT/REFERENCES_PAST; Reihenfolgebeziehungen EVENT → EVENT mit BEFORE. Bestehende Sonderregeln gelten weiterhin. Projektübergreifende Ereignisbeziehungen verlangen eigene Bücher desselben Universums; geteilte Universumseinträge benötigen weiterhin ausdrückliche Buchverwendung. Sichtbarkeit beider Endpunkte wird geprüft.

Ereignisbelege verlangen ein eigenes Quellkapitel desselben Projekts, einen echten eindeutigen Textanker und beim Anlegen/Neuverankern `sourceExpectedUpdatedAt`. Kapiteltext wird niemals verändert.

Alle neuen Mutationen laufen im bestehenden Story-Service unter Serializable-Isolation und Compare-and-Swap. Fehler werfen innerhalb der Transaktion und rollen sämtliche Änderungen zurück. Löschen verwendet `deleteRelationsForEntity`: Beziehungen beider Richtungen und Quellenbelege werden entfernt, zeitliche Aussagen blockieren die Löschung mit 409. Andere Wissenseinträge und Kapitel bleiben bestehen. Beziehungen/Belege besitzen separate Versionen; deren Änderung ändert nicht automatisch die Ereignisversion.

## Prüfung

- Gesamte Jest-Suite: 95 Suiten erfolgreich, 656 Tests bestanden; vier opt-in Suiten / 20 Tests übersprungen.
- TypeScript `tsc --noEmit --incremental false`: erfolgreich.
- `npm run build`: erfolgreich; vorhandene Sentry-Konfigurationshinweise.
- `scripts/test-story-mcp-http.mjs`: 65 Assertions mit echtem lokalen PostgreSQL, Redis und offiziellem MCP-SDK. Anlegen, Lesen, Teilupdate/Leeren, Verknüpfen/Bearbeiten, Belegen/Lesen/Bearbeiten, Sortieren, Löschen, unveränderte Kapitel/Entitäten, stale Delete/Reorder ohne Teiländerungen und konkurrierende Updates (genau ein Gewinner).
- Isolierte synthetische Testfamilie wird im finally entfernt. Keine produktiven Buchinhalte verwendet. Teststart wie in `chatgpt-mcp-local-testing.md`, mit `MYTHOS_RUN_MCP_INTEGRATION=1`.
- Tatsächlich über HTTP gemessen: **59 Werkzeuge**. Der Repository-Stand hatte bereits 55 (einschließlich Universumswerkzeugen), nicht die 33 der genannten Verbindung. Diese Erweiterung ergänzt vier.

## Deployment und ChatGPT

Keine neue Schemaänderung oder Datenmigration. Bestehende Migrationen des Zielstands müssen installiert sein. Regulär Prisma Client generieren, Anwendung bauen und deployen/neustarten; unveränderte MCP-URL `/api/integrations/mcp`. Kein `db push` auf produktiven Datenbanken.

Danach die benutzerdefinierte Verbindung in ChatGPT Plugins öffnen, **Refresh** ausführen, Metadaten und die vier neuen Werkzeuge prüfen und einen neuen Chat für den Test beginnen. Bei bisher reinem Lesegrant erneut mit Schreibscope autorisieren. Etwaige Workspace-Freigaben durch zuständige Administratoren durchführen; die lokale Implementierung erteilt keine ChatGPT-Freigabe. Veröffentlichte Plugins unterliegen dem separaten Review-Verfahren. Quelle: [OpenAI: Verbindung und Metadaten aktualisieren](https://developers.openai.com/plugins/deploy/connect-chatgpt#refresh-metadata).

Produktive Erreichbarkeit, Freigabe und Werkzeuganzahl der bestehenden ChatGPT-Verbindung wurden nicht verändert oder bestätigt.
