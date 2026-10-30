import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalTestTargets } from '../../frontend/scripts/local-test-targets.mjs';
const local = { DATABASE_URL: 'postgresql://test:unused@127.0.0.1:55432/mythos_integration_test', REDIS_URL: 'redis://127.0.0.1:56379' };
const container = { DATABASE_URL: 'postgresql://test:unused@mythos-security-123-456-db:5432/mythos_integration_test', REDIS_URL: 'redis://mythos-security-123-456-redis:6379', MYTHOS_SECURITY_CONTAINER_TEST: '1', MYTHOS_SECURITY_TEST_PREFIX: 'mythos-security-123-456' };
test('normal local test targets still require loopback and the disposable database', () => {
 assert.doesNotThrow(()=>assertLocalTestTargets(local));
 for(const url of ['postgresql://test@production:55432/mythos_integration_test','postgresql://test@127.0.0.1:5432/mythos_integration_test','postgresql://test@127.0.0.1:55432/mythos']) {
  assert.throws(()=>assertLocalTestTargets({...local,DATABASE_URL:url}));
 }
 assert.throws(()=>assertLocalTestTargets({...local,REDIS_URL:'redis://production:6379'}));
});
test('container mode requires explicit opt-in and matching unique harness services', () => {
 assert.doesNotThrow(()=>assertLocalTestTargets(container));
 for(const override of [
  {MYTHOS_SECURITY_CONTAINER_TEST:undefined},
  {MYTHOS_SECURITY_TEST_PREFIX:'production'},
  {MYTHOS_SECURITY_TEST_PREFIX:'mythos-security-123-456.evil.example'},
  {DATABASE_URL:'postgresql://test@production:5432/mythos_integration_test'},
  {DATABASE_URL:'postgresql://test@mythos-security-123-456-db:5432/mythos'},
  {DATABASE_URL:'postgresql://test@mythos-security-123-456-db:55432/mythos_integration_test'},
  {REDIS_URL:'redis://production:6379'},
  {REDIS_URL:'redis://mythos-security-789-456-redis:6379'}
 ]) assert.throws(()=>assertLocalTestTargets({...container,...override}));
});
