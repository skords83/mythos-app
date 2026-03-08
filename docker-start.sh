#!/bin/sh
echo "Running database migrations..."
npx prisma db push --accept-data-loss || echo "Migration failed, continuing..."

echo "Starting application..."
exec node .next/standalone/server.js