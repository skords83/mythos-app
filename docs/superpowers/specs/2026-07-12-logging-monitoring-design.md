# Logging & Error-Tracking — Design

**Datum:** 2026-07-12
**Status:** Genehmigt

## Problem

`frontend/src/app/api/**` enthält 25 verstreute `console.error`-Aufrufe ohne Struktur, Kontext (Request-Route, User) oder Alerting. Fehler sind nur über `docker logs` einsehbar, nichts wird proaktiv gemeldet. Client-seitige Fehler (z. B. im TipTap-Editor) sind komplett unsichtbar.

## Ziel

Strukturiertes Logging **und** Error-Tracking in einem Rutsch, kein Zwischenschritt.

## Entscheidungen (mit Nutzer abgestimmt)

| Frage | Entscheidung |
|---|---|
| Hosting des Tracking-Tools | Sentry SaaS (kein zusätzlicher Docker-Container, kostenloser Tier ausreichend) |
| Scope | Server **und** Client (offizielles `@sentry/nextjs`-SDK deckt beides sowie Edge/Middleware ab) |
| Performance-Tracing | Nein — nur Fehler, kein `tracesSampleRate`/Prisma-Instrumentierung |

## Architektur

Zwei sich ergänzende Bausteine:

1. **`@sentry/nextjs`** — Error-Tracking für Server-Routen, Client-Components und Edge-Middleware. Kein Performance-Tracing.
2. **`frontend/src/lib/logger.ts`** (pino) — strukturierter JSON-Logger für alle Log-Level (info/warn/error), ersetzt rohe `console.*`-Aufrufe. `logger.error()` ruft intern zusätzlich `Sentry.captureException()` auf, sodass ein Call-Site für beides reicht.

## Komponenten

- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` (Next.js-Standardstruktur via `@sentry/wizard`, danach manuell geprüft)
- `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN` (client) als optionale env vars — Build und Dev funktionieren ohne, analog zum bestehenden lazy-`JWT_SECRET`-Pattern (`frontend/src/lib/auth.ts`). Fehlt die DSN, wird Sentry.init übersprungen, pino loggt weiterhin nach stdout.
- `frontend/src/lib/logger.ts`: pino-Instanz, JSON nach stdout (kompatibel mit `docker logs`/Traefik-Setup ohne weiteres Tooling). Redaction-Liste für `password`, `token`, `authorization`, `jwt` — diese Felder werden in Log-Objekten durch `[REDACTED]` ersetzt, bevor sie geloggt oder an Sentry übergeben werden.
- `frontend/src/app/error.tsx`: Next.js Error Boundary für unbehandelte React-Fehler (z. B. im Editor), meldet an Sentry über `Sentry.captureException` im `useEffect`.
- Alle 25 `console.error`-Stellen in `frontend/src/app/api/**` werden durch `logger.error(err, { route, userId })` ersetzt (Route und, falls durch `getUserFromRequest` bereits bekannt, User-ID als Kontext).

## Datenfluss

```
API-Route try/catch
  → logger.error(err, { route, userId })
      → pino: JSON-Zeile nach stdout (docker logs)
      → Sentry.captureException(err, { extra: context })  [nur bei echten 5xx/unerwarteten Exceptions]
```

Erwartete 4xx-Fälle (z. B. 401 bei falschem Passwort, 400 bei Validierungsfehlern) werden mit `logger.warn()` geloggt, **nicht** an Sentry gemeldet — sonst Rauschen und unnötiger Quota-Verbrauch im Free-Tier. Nur unerwartete Exceptions (Datenbankfehler, ungefangene Fehler) landen als Sentry-Event.

## Fehlerbehandlung / Edge Cases

- Middleware (`frontend/src/middleware.ts`) läuft auf der Edge-Runtime — nutzt `sentry.edge.config.ts`, kein Node-`pino` dort möglich (kein Node-API-Zugriff auf Edge). Fehler dort gehen direkt über `Sentry.captureException`, kein pino-Log.
- Fehlt `SENTRY_DSN` in Produktion, soll das kein harter Fehler sein (App muss weiter starten) — nur eine einmalige Warnung beim Boot über `logger.warn`.

## Testing

- Unit-Test für `logger.ts`: Redaction-Liste entfernt Secrets aus Log-Payloads, bevor sie ausgegeben werden.
- Test/Verifikation, dass `npm run build` ohne gesetzte `SENTRY_DSN` weiterhin durchläuft (wie bereits beim `JWT_SECRET`-Pattern etabliert).
- Kein Live-Smoke-Test gegen echtes Sentry-Projekt möglich (Sandbox ohne Internetzugang zu externen Diensten / kein echter DSN vorhanden) — wird dokumentiert als offene Verifikationslücke, analog zu den bisherigen Docker/Redis-Smoke-Test-Lücken in den anderen Backlog-Punkten.

## Scope-Abgrenzung (explizit nicht Teil dieser Arbeit)

- Kein GlitchTip/Self-Hosting des Tracking-Tools.
- Kein Performance-Tracing/APM.
- Keine Prisma-Query-Instrumentierung.
- Keine Alerting-Regeln-Konfiguration innerhalb Sentry selbst (Projekt-Setup/DSN-Erzeugung obliegt dem Nutzer im Sentry-Dashboard, da das einen externen Account erfordert).
