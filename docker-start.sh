#!/bin/sh
echo "Running database migrations..."
chmod -R 777 /app/node_modules/.prisma 2>/dev/null || true
npx prisma db push --accept-data-loss 2>&1 || echo "Migration failed, continuing..."

echo "Starting application..."
exec node .next/standalone/server.js