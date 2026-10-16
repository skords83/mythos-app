# Lokale OAuth-/MCP-Tests und ChatGPT-Einrichtung

Alle Befehle beziehen sich auf `~/Dokumente/Projekte/mythos-app`. Nicht die produktive Compose-Datei verwenden. Nie Produktionszugangsdaten übernehmen. Die Hilfsskripte verweigern Datenbanken außerhalb von `127.0.0.1:55432/mythos_integration_test`.

## Bereits eingerichteter Rechner

`frontend/.env.local` wurde mit neuen Secrets und Dateimodus 0600 angelegt und ist nicht versioniert. PostgreSQL läuft als eigener Benutzerprozess auf `127.0.0.1:55432`; Redis auf `127.0.0.1:56379` ohne Persistenz. Es waren weder Podman noch Docker installiert, daher liegen die lokalen Testbinaries unter `/tmp`:

- PostgreSQL-Binaries: `/tmp/mythos-mcp-tools/node_modules/@embedded-postgres/linux-x64/native/`
- PostgreSQL-Daten: `/tmp/mythos-mcp-postgres-v2/`
- Wiederstart: `node /tmp/mythos-mcp-tools/start.mjs`
- Redis-Wiederstart: `/tmp/redis-7.4.2/src/redis-server --bind 127.0.0.1 --port 56379 --save '' --appendonly no --protected-mode yes`

Diese Dateien können nach einem Neustart verschwunden sein. Für eine dauerhafte, reproduzierbare Einrichtung empfiehlt sich die folgende separate Test-Compose-Datei. Nicht gleichzeitig beide Varianten auf denselben Ports starten.

## Neue isolierte Umgebung mit Podman/Docker

Node.js >= 20.6, npm und Podman Compose (alternativ Docker Compose) erforderlich. Für Next.js eine unterstützte Node-LTS-Version verwenden.

```bash
cd ~/Dokumente/Projekte/mythos-app
node frontend/scripts/init-local-test-env.mjs
podman compose --env-file frontend/.env.local -f docker-compose.test.yml up -d
cd frontend
npm ci
node --env-file=.env.local scripts/prepare-local-test-db.mjs
npm run dev -- --hostname 127.0.0.1
```

Der Initialisierungsschritt verweigert das Überschreiben einer vorhandenen `.env.local`. Die Compose-Umgebung besitzt eigene Volumes und bindet ausschließlich Loopback-Ports. Das Schema wird nur für die Wegwerftestdatenbank mit `db push` angelegt, da die historische Migrationsfolge keine leere Ausgangsdatenbank vollständig initialisiert. Das ist **keine** Anweisung für eine Produktionsmigration.

Benötigte Variablen:

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | Ausschließlich isolierte PostgreSQL-Testdatenbank |
| `REDIS_URL` | `redis://127.0.0.1:56379` |
| `JWT_SECRET` | Neu erzeugtes Geheimnis für lokale Sitzungscookies |
| `MYTHOS_OAUTH_ISSUER` | Kanonischer Ursprung, lokal `http://localhost:4000`; für gesondertes Staging dessen HTTPS-Ursprung, ohne Pfad |
| `MYTHOS_TEST_DB_PASSWORD` | Nur für die Test-Compose-Datei |
| `MYTHOS_RUN_MCP_INTEGRATION=1` | Explizite Freigabe des synthetischen HTTP-Testlaufs |

`MYTHOS_INTEGRATION_READ_TOKEN` und `MYTHOS_INTEGRATION_USER_ID` leer lassen; MCP akzeptiert diese historischen statischen Credentials nicht. Sentry-DSNs in der Testumgebung ebenfalls leer lassen. `.env.local` oder Tokens niemals committen, in Chat einfügen oder in Shell-History übernehmen.

## Automatisierte Prüfungen

In einem zweiten Terminal bei laufenden lokalen Diensten und Next.js auf Port 4000:

```bash
cd ~/Dokumente/Projekte/mythos-app/frontend
MYTHOS_RUN_MCP_INTEGRATION=1 node --env-file=.env.local scripts/test-mcp-http.mjs
npm test -- --runInBand
npx tsc --noEmit
npm run build
git diff --check
```

`npm run test:mcp` führt denselben HTTP-Test aus, wenn die Variablen bereits im Prozess gesetzt sind. Der Test meldet nur Ergebnisse, keine Credentials. Er erzeugt zufällige Benutzer/Projekte/Clients, führt die echte Anmeldung und den OAuth-Flow aus und entfernt nur eigene Fixtures. Nicht parallel zu `next build` einen `next dev` auf demselben `.next`-Verzeichnis verwenden.

## Gesonderter ChatGPT-Test (noch nicht durchgeführt)

Die folgenden Schritte erfordern einen eigenen HTTPS-Testendpunkt und Zugang zur ChatGPT-Verbindungsverwaltung. **Nicht `mythos.skords.de` verwenden.** Vor öffentlicher Erreichbarkeit die offenen Sicherheitsbefunde im [Statusbericht](chatgpt-integration-status.md) bearbeiten.

1. Testinstanz mit synthetischen Daten über einen separaten HTTPS-Ursprung erreichbar machen. `MYTHOS_OAUTH_ISSUER` exakt auf diesen Ursprung setzen, Server neu starten. Metadaten müssen öffentlich lesbar sein; MCP-Daten bleiben OAuth-geschützt. Proxy muss Origin, Authorization, Accept und MCP-Protocol-Version korrekt weitergeben, Proxy-Header bereinigen und OAuth-/Cookie-/Token-Inhalte aus Logs ausschließen.
2. In ChatGPT einen benutzerdefinierten MCP-Server mit OAuth anlegen, URL `https://TESTHOST/api/integrations/mcp`. Einen **vorab registrierten öffentlichen Client** auswählen/eintragen, Authentifizierungsmethode `none` (kein Secret). Discovery liefert Autorisierungs- und Token-URL; falls manuell benötigt: `/oauth/authorize` und `/api/oauth/token`. Scope: `mythos:read`.
3. Die **genau von dieser ChatGPT-Verbindung angezeigte Callback-URI** kopieren; keine URI raten, keine Wildcards und keine pauschale Hostfreigabe. In der lokalen Testdatenbank mit einem neuen eindeutigen Client-ID-Wert registrieren:

   ```bash
   cd frontend
   node --env-file=.env.local scripts/register-local-oauth-client.mjs mythos-chatgpt-test 'ChatGPT Test' 'EXAKTE_HTTPS_CALLBACK_URI'
   ```

   Das Skript registriert nur in der lokalen Testdatenbank und überschreibt keinen bestehenden Client. Dieselbe Client-ID in ChatGPT eintragen. Es wird kein Client-Secret ausgestellt. Wenn die verfügbare ChatGPT-Oberfläche keinen öffentlichen vorregistrierten Client unterstützt, diesen Modus nicht durch ein erfundenes Secret ersetzen; die tatsächlich angebotene Clientkonfiguration muss dann geprüft werden.
4. Verbinden, mit einem lokalen Testkonto anmelden und Lesefreigabe erteilen. Projekte auflisten und ein Testkapitel lesen. Fremde Projekte und Schreib-/Löschaktionen müssen ausgeschlossen bleiben.
5. Widerruf und erneute Autorisierung prüfen. Tokens laufen nach einer Stunde ab; kein Refresh-Token-Grant. Bei Änderung des Testursprungs ist erneute Autorisierung erforderlich.
6. Ergebnis und konkrete ChatGPT-Konfiguration dokumentieren. Erst danach lässt sich eine tatsächliche ChatGPT-Kompatibilität bestätigen. Eine spätere Produktionsübernahme ist ein eigener freizugebender Schritt.

Referenzen: [OpenAI Authentication](https://developers.openai.com/plugins/build/auth), [Custom MCP servers](https://developers.openai.com/api/docs/guides/custom-mcp-server).
