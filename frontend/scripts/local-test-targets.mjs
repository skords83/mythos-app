import assert from 'node:assert/strict'

// An explicit container-harness mode permits only its uniquely named disposable
// services. Normal developer runs remain restricted to the original loopback DB.
export function assertLocalTestTargets(env = process.env) {
  const db = new URL(env.DATABASE_URL || 'file:///missing')
  assert.equal(db.pathname, '/mythos_integration_test', 'Refusing non-test database')
  if (env.MYTHOS_SECURITY_CONTAINER_TEST === '1') {
    const prefix = env.MYTHOS_SECURITY_TEST_PREFIX || ''
    assert.match(prefix, /^mythos-security-[0-9]+-[0-9]+$/, 'Invalid disposable container prefix')
    assert.equal(db.hostname, prefix + '-db', 'Refusing non-harness database')
    assert.equal(db.port, '5432', 'Refusing non-test container DB port')
    assert.equal(env.REDIS_URL, `redis://${prefix}-redis:6379`, 'Refusing non-harness Redis')
  } else {
    assert.equal(db.hostname, '127.0.0.1', 'Refusing non-loopback DB')
    assert.equal(db.port, '55432', 'Refusing non-test DB port')
    assert.equal(env.REDIS_URL, 'redis://127.0.0.1:56379', 'Refusing non-test Redis')
  }
}
