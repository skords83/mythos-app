# Mythos

Ein Schreib-Tool für Autor:innen: Projekte mit Kapiteln, Charakteren, Orten und Notizen verwalten, im Rich-Text-Editor schreiben und als PDF oder ePub exportieren.

## Stack

- [Next.js](https://nextjs.org/) 14 (App Router) mit TypeScript
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Tiptap](https://tiptap.dev/) als Rich-Text-Editor
- Tailwind CSS
- JWT-basierte Auth (Cookie), eigenes Rate-Limiting, CSP mit Nonce

## Lokale Entwicklung

Voraussetzungen: Node.js 20+, eine laufende PostgreSQL-Instanz.

```bash
cd frontend
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET setzen
npx prisma db push
npm run dev
```

Die App läuft danach auf [http://localhost:4000](http://localhost:4000).

### Nützliche Scripts (in `frontend/`)

```bash
npm run dev          # Dev-Server
npm run build         # Production-Build
npm start             # Production-Server (nach build)
npm run lint           # ESLint
npm test               # Jest-Testsuite
npm run test:watch     # Jest im Watch-Modus
```

## Deployment (Docker Compose)

Das Repo enthält ein `docker-compose.yml` für den Betrieb hinter Traefik (App + PostgreSQL, jeweils mit Healthcheck).

```bash
cp .env.example .env   # POSTGRES_PASSWORD, JWT_SECRET setzen
docker compose up -d
```

Der App-Container führt beim Start automatisch `prisma db push` aus (siehe `docker-start.sh`) und lauscht auf Port 4000.

### Relevante Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring |
| `JWT_SECRET` | Secret zum Signieren der Auth-Cookies |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | DB-Zugangsdaten (nur `docker-compose.yml`) |
| `UPLOAD_DIR` | Zielverzeichnis für hochgeladene Bilder |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional — leer lassen deaktiviert Sentry, mit DSN eines Sentry-Projekts (sentry.io) befüllen aktiviert Error-Tracking |

## Projektstruktur

```
frontend/src/app/
├── api/            # Next.js Route Handler (auth, projects, chapters, characters, places, notes, upload, health)
├── components/     # Geteilte React-Komponenten (Modals, Editor, Cards, ...)
├── dashboard/       # Projektübersicht
├── login/          # Login & Registrierung (Umschalt-Formular, eine Route)
└── page.tsx         # Haupt-Editor-Ansicht
frontend/prisma/     # Prisma-Schema und Migrationen
```

## Tests

Unit-Tests mit Jest + React Testing Library (`frontend/`):

```bash
npm test
```
