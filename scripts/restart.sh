#!/bin/bash
set -e

echo "🔄 Stoppe Container..."
docker-compose down

echo "🏗️  Baue und starte Container..."
docker-compose up -d --build

echo "✅ Fertig! Die App läuft auf http://localhost:4000"
