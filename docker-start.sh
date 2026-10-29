#!/bin/sh
set -e

echo "Running database migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy

echo "Starting application..."
exec node /app/server.js
