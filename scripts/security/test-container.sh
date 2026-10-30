#!/usr/bin/env bash
# Requires frontend npm ci + prisma generate. Only creates disposable resources.
set -euo pipefail
engine=${CONTAINER_ENGINE:-docker}
image=${1:?Supply the candidate image}
prefix="mythos-security-$(date +%s)-$$"
cleanup() {
  "$engine" rm -f "$prefix-app" "$prefix-db" "$prefix-redis" >/dev/null 2>&1 || true
  "$engine" volume rm "$prefix-uploads" >/dev/null 2>&1 || true
  "$engine" network rm "$prefix-internal" "$prefix-front" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$engine" network create --internal "$prefix-internal"
"$engine" network create "$prefix-front"
password=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
export DATABASE_URL="postgresql://mythos_test:$password@127.0.0.1:55432/mythos_integration_test"
export REDIS_URL=redis://127.0.0.1:56379
export MYTHOS_OAUTH_ISSUER=http://localhost:4000
export MYTHOS_RUN_MCP_INTEGRATION=1
"$engine" run -d --name "$prefix-db" --network "$prefix-internal" -p 127.0.0.1:55432:5432 -e POSTGRES_USER=mythos_test -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=mythos_integration_test docker.io/library/postgres:15-alpine
"$engine" run -d --name "$prefix-redis" --network "$prefix-internal" -p 127.0.0.1:56379:6379 docker.io/library/redis:7-alpine redis-server --save '' --appendonly no
for attempt in {1..60}; do
  if "$engine" exec "$prefix-db" pg_isready -U mythos_test; then break; fi
  sleep 1
done
(cd frontend && node node_modules/prisma/build/index.js db push --skip-generate)
MYTHOS_SECURITY_FIXTURE=1 node scripts/security/prepare-fixture.mjs
"$engine" volume create "$prefix-uploads"
"$engine" run -d --name "$prefix-app" --network "$prefix-internal" --network "$prefix-front" --cap-drop ALL --security-opt no-new-privileges -p 127.0.0.1:4000:4000 -v "$prefix-uploads:/app/public/uploads" -e "DATABASE_URL=postgresql://mythos_test:$password@$prefix-db:5432/mythos_integration_test" -e "REDIS_URL=redis://$prefix-redis:6379" -e "JWT_SECRET=$password" -e MYTHOS_OAUTH_ISSUER "$image"
for attempt in {1..60}; do
  if "$engine" exec "$prefix-app" node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then break; fi
  sleep 1
done
"$engine" exec "$prefix-app" node -e "const s=require('fs').readFileSync('/proc/1/status','utf8');if(!/CapEff:\\s+0+\\n/.test(s)||!/NoNewPrivs:\\s+1/.test(s))process.exit(1)"
node frontend/scripts/test-mcp-http.mjs
# Restart with the same upload volume: test existing files remain accessible/writable.
"$engine" exec "$prefix-app" node -e "require('fs').writeFileSync('/app/public/uploads/restart-fixture','persisted',{mode:0o600})"
"$engine" restart "$prefix-app"
for attempt in {1..60}; do
  if "$engine" exec "$prefix-app" node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then break; fi
  sleep 1
done
"$engine" exec "$prefix-app" node -e "const fs=require('fs');if(fs.readFileSync('/app/public/uploads/restart-fixture','utf8')!=='persisted')process.exit(1);fs.appendFileSync('/app/public/uploads/restart-fixture','-writable')"
node frontend/scripts/test-mcp-http.mjs
"$engine" logs "$prefix-app"
