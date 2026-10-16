# Mythos OAuth / MCP — Stand 16.10.2026

Lokale OAuth-/MCP-Integration implementiert und mit echter PostgreSQL-Datenbank, HTTP und dem offiziellen MCP-TypeScript-Client geprüft. **Noch keine bestätigte Verbindung aus ChatGPT, keine Produktionsfreigabe.** Auf `feature/chatgpt-mcp-readonly` entwickelt; Produktionsinstallation und Git-Stashes unverändert.

## Implementiert

- Ausschließlich sieben Lesewerkzeuge: Projekte, Kapitelübersicht, Kapitel mit Tiptap-JSON, Figuren, Orte, Zeitlinie und Lore.
- Zustandsloses Streamable HTTP mit JSON-Antworten. POST für Nachrichten; authentifiziertes GET/DELETE liefert 405 (keine SSE-Push-Verbindung, keine Session). Protokolle `2025-03-26`, `2025-06-18`, `2025-11-25`; unbekannte Initialisierungsversionen erhalten die neueste unterstützte Version. Unbekannte Versionsheader werden mit 400 abgelehnt.
- OAuth Authorization Code mit S256-PKCE und expliziter Zustimmung. Vorab registrierter öffentlicher Client, `token_endpoint_auth_methods_supported: ["none"]`. Kein Client-Secret, keine DCR-/CIMD-Registrierung.
- Discovery unter `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource` und `/.well-known/oauth-protected-resource/api/integrations/mcp`.
- Verpflichtender `resource`-Parameter bei Autorisierung und Token-Austausch, Speicherung auf Code und Token und Prüfung am MCP-Endpunkt. Kanonische Adresse aus `MYTHOS_OAUTH_ISSUER`, niemals aus Host-/Forwarded-Headern.
- `WWW-Authenticate` bei fehlenden/ungültigen Tokens (401) und unzureichendem Scope (403); Leseberechtigung und OAuth-Schema pro Werkzeug deklariert.
- Code-Einlösung und Token-Ausstellung in einer Datenbanktransaktion; auch parallele Einlösung erlaubt nur einen Erfolg. Codes 5 Minuten, Tokens 1 Stunde; nur Hashes gespeichert. Session-authentifizierter Widerruf über `/api/oauth/revoke`.
- MCP akzeptiert nur exakt `mythos:read`. Statische Entwicklungstokens, alte Tokens ohne Ressourcenbindung sowie Tokens mit Schreibrechten werden dort abgewiesen. Die historische REST-Integration bleibt separat bestehen.
- Nur eigene Projekte; fremde Kapitel werden auch bei manipulierten IDs ausgeschlossen. PRIVATE/FAMILY-Sichtbarkeit innerhalb berechtigter Projekte berücksichtigt.
- Verteilte Redis-Rate-Limits pro vertrauenswürdigem Proxy-IP-Wert: OAuth-Autorisierung 120/min, Token-Austausch 60/min, MCP 300/min. Bei Redis-Ausfall werden diese Endpunkte mit 503 geschlossen; die bisherige Fail-open-Strategie anderer App-Routen bleibt bestehen.
- Origin-Prüfung, begrenztes Lesen eingehender Bodies (16 KiB MCP / 8 KiB OAuth), Argumentvalidierung und maximal 256 KiB pro MCP-Werkzeugantwort inklusive JSON-Escaping. Keine Tokens/Passwörter in Testausgaben.

## Verifikation

Siehe [lokale Einrichtung und Testbefehle](chatgpt-mcp-local-testing.md). Der HTTP-Test umfasst echte Anmeldung, Discovery, Zustimmung, PKCE, parallele Code-Einlösung, Token-Ausstellung, SDK-Initialisierung/Tool-Liste/Tool-Aufruf, alle sieben Werkzeuge, Projekt-/Kapitelgrenzen, PRIVATE/FAMILY-Sichtbarkeit, fehlende/ungültige/abgelaufene/widerrufene Tokens, Ressourcenbindung und Scope-Prüfung. Fixtures werden ausschließlich in der isolierten Datenbank erzeugt und gezielt entfernt.

526 Unit-Tests in 84 Suites bestanden; TypeScript (`tsc --noEmit --incremental false`), Next.js-Produktionsbuild und `git diff --check` erfolgreich. Der HTTP-Test wurde zusätzlich gegen den gebauten lokalen Server ausgeführt. Die drei älteren opt-in Datenbank-Suites für **schreibende** Kapitelvorschläge gehören nicht zur MCP-Leseintegration und werden im Standardtestlauf übersprungen.

## Offene Freigabepunkte

1. Tatsächlicher Verbindungs- und Lesetest in ChatGPT über einen gesonderten HTTPS-Testendpunkt, mit ausschließlich synthetischen Daten. Lokaler SDK-Erfolg ist kein Nachweis einer ChatGPT-Verbindung.
2. Vor öffentlicher Freigabe Abhängigkeiten aktualisieren und erneut prüfen: `npm audit --omit=dev` meldete am 16.10.2026 **42 Befunde (3 kritisch, 8 hoch, 31 mittel)**, u. a. Next.js und html2pdf.js/jsPDF. Keine pauschale Framework-/Export-Migration innerhalb dieses MCP-Schritts vorgenommen.
3. Öffentlichen Testbetrieb durch HTTPS und Rate-Limits für OAuth und MCP absichern. Die Anwendung begrenzt OAuth/MCP bereits über Redis; zusätzlich müssen öffentliche Proxys Client-IP-Header selbst setzen, da vom Client gelieferte Forwarded-Header keine vertrauenswürdige Identität sind. Keine Tokens, Codes, Cookie-/Authorization-Header oder vollständigen OAuth-Querystrings in Proxy-/Access-Logs aufnehmen.
4. Keine Refresh-Tokens: nach einer Stunde erneut autorisieren. Sehr große Einzelkapitel werden als Tool-Fehler abgewiesen; Chunk-Lesen ist noch nicht implementiert. Listen mit kleinerem `limit` erneut abfragen.
5. Migration `20261016180000_oauth_resource_binding` ist vorbereitet, aber **nicht auf Produktion angewandt**. Alte MCP-Verbindungen müssen nach Ressourcenbindung neu autorisiert werden.
6. Jede spätere Produktivübernahme benötigt eine separate Freigabe.

## Quellen

- [OpenAI: Authentication](https://developers.openai.com/plugins/build/auth)
- [OpenAI: Custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
