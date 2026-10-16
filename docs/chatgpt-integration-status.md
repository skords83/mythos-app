# Mythos OAuth / MCP — Stand 17.10.2026

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

526 Unit-Tests in 84 Suites bestanden; TypeScript (`tsc --noEmit --incremental false`), Next.js-15.5.28-Produktionsbuild und `git diff --check` erfolgreich. 61 HTTP-/OAuth-/MCP-Prüfungen liefen gegen den gebauten Server. Chromium bestätigte Login, Projekt-/Kapitelnavigation, Editor und PDF-Download ohne CSP-Verstöße oder JavaScript-Fehler. Der erzeugte PDF-Download ist eine gültige A4-Datei; der Inhaltstest fand Titel und Kapitelüberschrift, aber keinen Kapiteltext, daher ist der PDF-Textinhalt noch nicht vollständig verifiziert. Die drei älteren opt-in Datenbank-Suites für **schreibende** Kapitelvorschläge gehören nicht zur MCP-Leseintegration und werden im Standardtestlauf übersprungen.

## Offene Freigabepunkte

1. Tatsächlicher Verbindungs- und Lesetest in ChatGPT über einen gesonderten HTTPS-Testendpunkt, mit ausschließlich synthetischen Daten. Lokaler SDK-Erfolg ist kein Nachweis einer ChatGPT-Verbindung.
2. `npm audit --omit=dev` meldete am 17.10.2026 **28 mittlere Befunde, keine kritischen oder hohen**. Next.js wurde auf 15.5.28, React auf 19.3.1 und html2pdf.js auf 0.14.0 aktualisiert; PostCSS wird per Override auf 8.5.30 gehoben. Veraltete synchrone Route-Parameter wurden auf Promises umgestellt. Die Befunde stammen überwiegend aus Tiptap 2. Das upstream veröffentlichte Advisory GHSA-cp6q-959q-f8rh (dort als hoch eingestuft) betrifft ungeprüfte dynamische Attribute in `mergeAttributes`; die statischen Mythos-Schemas und der schreibgeschützte MCP-Endpunkt exponieren diesen Eingabepfad nicht. Tiptap 3 ist ein separates Editor-Migrationsrisiko.
3. Für tatsächliche ChatGPT-Prüfung eine separate HTTPS-Testadresse bereitstellen. Die Anwendung begrenzt OAuth/MCP über Redis; der HTTPS-Proxy muss Client-IP-Header selbst setzen und sensible Header/Querystrings aus Logs ausschließen. Keine Tokens, Codes, Cookie-/Authorization-Header oder vollständigen OAuth-Querystrings in Proxy-/Access-Logs aufnehmen.
4. Keine Refresh-Tokens: nach einer Stunde erneut autorisieren. Sehr große Einzelkapitel werden als Tool-Fehler abgewiesen; Chunk-Lesen ist noch nicht implementiert. Listen mit kleinerem `limit` erneut abfragen.
5. Migration `20261016180000_oauth_resource_binding` ist vorbereitet, aber **nicht auf Produktion angewandt**. Alte MCP-Verbindungen müssen nach Ressourcenbindung neu autorisiert werden.
6. Jede spätere Produktivübernahme benötigt eine separate Freigabe.

## Zusätzlich gefundener CSP-Fehler

Die strikte Nonce-CSP blockierte das statisch erzeugte Login-HTML. Das App-Layout rendert nun dynamisch und übernimmt den Request-Nonce auch für das inline Theme-Skript. Das folgt der [Next.js-CSP-Dokumentation](https://nextjs.org/docs/app/guides/content-security-policy), die für Nonces dynamische Seiten voraussetzt. Browserprüfung läuft nach dem Build.

## Quellen

- [OpenAI: Authentication](https://developers.openai.com/plugins/build/auth)
- [OpenAI: Custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Next.js CSP mit Nonces](https://nextjs.org/docs/app/guides/content-security-policy)
- [Tiptap-Advisory GHSA-cp6q-959q-f8rh](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh)
- [MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
