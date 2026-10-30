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
export DATABASE_URL="postgresql://mythos_test:$password@$prefix-db:5432/mythos_integration_test"
export REDIS_URL="redis://$prefix-redis:6379"
export MYTHOS_OAUTH_ISSUER=http://localhost:4000
export MYTHOS_RUN_MCP_INTEGRATION=1
export MYTHOS_SECURITY_CONTAINER_TEST=1
export MYTHOS_SECURITY_TEST_PREFIX="$prefix"
# No host-published ports, including for the fixture runner. Only the app joins
# the front network; DB and Redis remain exclusively on the internal network.
"$engine" run -d --name "$prefix-db" --network "$prefix-internal" -e POSTGRES_USER=mythos_test -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=mythos_integration_test docker.io/library/postgres:15-alpine
"$engine" run -d --name "$prefix-redis" --network "$prefix-internal" docker.io/library/redis:7-alpine redis-server --save '' --appendonly no
# Verify actual engine configuration as well as the production Compose contract.
"$engine" network inspect "$prefix-internal" --format '{{.Internal}}' | node -e "if(require('fs').readFileSync(0,'utf8').trim()!=='true')process.exit(1)"
"$engine" inspect "$prefix-db" "$prefix-redis" | TEST_INTERNAL_NETWORK="$prefix-internal" node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  for (const c of JSON.parse(fs.readFileSync(0,"utf8"))) {
    assert.deepEqual(Object.keys(c.NetworkSettings.Networks), [process.env.TEST_INTERNAL_NETWORK]);
    assert.equal(Object.keys(c.HostConfig.PortBindings || {}).length, 0, "DB/Redis must not publish ports");
  }
'
run_test() {
  local network=$1
  shift
  "$engine" run --rm --network "$network" --cap-drop ALL --security-opt no-new-privileges \
    --entrypoint node --workdir /tests \
    -v "$PWD/frontend/node_modules:/tests/frontend/node_modules:ro" \
    -v "$PWD/frontend/prisma:/tests/frontend/prisma:ro" \
    -v "$PWD/frontend/scripts:/tests/frontend/scripts:ro" \
    -v "$PWD/scripts/security:/tests/scripts/security:ro" \
    -e DATABASE_URL -e REDIS_URL -e MYTHOS_OAUTH_ISSUER -e MYTHOS_RUN_MCP_INTEGRATION \
    -e MYTHOS_SECURITY_CONTAINER_TEST -e MYTHOS_SECURITY_TEST_PREFIX \
    -e MYTHOS_SECURITY_FIXTURE=1 -e CHECKPOINT_DISABLE=1 "$image" "$@"
}
# Probe authenticated TCP/SQL from the same network as Prisma, not the DB's
# Unix socket (which can be ready during postgres's temporary init server).
run_test "$prefix-internal" scripts/security/wait-for-database.mjs
run_test "$prefix-internal" frontend/node_modules/prisma/build/index.js db push --schema frontend/prisma/schema.prisma --skip-generate
run_test "$prefix-internal" scripts/security/prepare-fixture.mjs
"$engine" volume create "$prefix-uploads"
"$engine" run -d --name "$prefix-app" --network "$prefix-internal" --network "$prefix-front" --cap-drop ALL --security-opt no-new-privileges -v "$prefix-uploads:/app/public/uploads" -e DATABASE_URL -e REDIS_URL -e "JWT_SECRET=$password" -e MYTHOS_OAUTH_ISSUER "$image"
wait_for_app() {
  for attempt in {1..60}; do
    if "$engine" exec "$prefix-app" node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then return; fi
    sleep 1
  done
  "$engine" logs "$prefix-app"
  echo 'App did not become healthy within 60 attempts' >&2
  return 1
}
wait_for_app
"$engine" exec "$prefix-app" node -e "const s=require('fs').readFileSync('/proc/1/status','utf8');if(!/CapEff:\\s+0+\\n/.test(s)||!/NoNewPrivs:\\s+1/.test(s))process.exit(1)"
# Verify image-level mitigation independently of no-new-privileges and confirm
# mount(2) cannot create even a harmless tmpfs in this disposable namespace.
"$engine" exec -i "$prefix-app" node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const binary of ['/usr/bin/mount', '/usr/bin/umount']) {
  assert.equal(fs.statSync(binary).mode & 0o6000, 0, `${binary} must not grant SUID/SGID privileges`);
}
const target = fs.mkdtempSync('/tmp/mythos-mount-denied-');
try {
  const result = spawnSync('/usr/bin/mount', ['-t', 'tmpfs', '-o', 'nosuid,nodev,noexec', 'tmpfs', target], {encoding:'utf8'});
  assert.ifError(result.error);
  if (result.status === 0) {
    spawnSync('/usr/bin/umount', [target]);
    assert.fail('Container unexpectedly allowed a tmpfs mount');
  }
  assert.match(result.stderr, /permission denied|Operation not permitted/i);
  console.log('PASS: mount helpers have no SUID/SGID privileges; kernel rejected tmpfs mount');
} finally { fs.rmdirSync(target); }
NODE
# Share only the app's network namespace: HTTP stays on localhost:4000, while
# DB/Redis use internal DNS exactly as the production app does. No Docker socket.
run_test "container:$prefix-app" frontend/scripts/test-mcp-http.mjs
"$engine" exec "$prefix-app" node -e "require('fs').writeFileSync('/app/public/uploads/restart-fixture','persisted',{mode:0o600})"
"$engine" restart "$prefix-app"
wait_for_app
"$engine" exec "$prefix-app" node -e "const fs=require('fs');if(fs.readFileSync('/app/public/uploads/restart-fixture','utf8')!=='persisted')process.exit(1);fs.appendFileSync('/app/public/uploads/restart-fixture','-writable')"
run_test "container:$prefix-app" frontend/scripts/test-mcp-http.mjs
"$engine" logs "$prefix-app"
