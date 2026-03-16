#!/bin/sh
echo "Running database migrations..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Migration done or failed, continuing..."

echo "Starting application..."
exec node .next/standalone/server.js