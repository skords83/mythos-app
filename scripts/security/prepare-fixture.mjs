// Disposable test database only; never run against an installation database.
import assert from 'node:assert/strict';
import { assertLocalTestTargets } from '../../frontend/scripts/local-test-targets.mjs';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '../../frontend/node_modules/@prisma/client/default.js';
assertLocalTestTargets();
assert.equal(process.env.MYTHOS_SECURITY_FIXTURE, '1');
const db = new PrismaClient();
try {
  await db.$executeRawUnsafe('CREATE TABLE "_prisma_migrations" (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)');
  const root = new URL('../../frontend/prisma/migrations/', import.meta.url);
  // Recreate the schema just before the final real migration. All tables are
  // empty and this database was created by the disposable container harness.
  await db.$executeRawUnsafe('DROP TABLE "ContinuityAssertion", "EntityUsage", "Universe" CASCADE');
  await db.$executeRawUnsafe('ALTER TABLE "Project" DROP COLUMN "universeId", DROP COLUMN "universeOrder"');
  for (const table of ['Character', 'Place', 'Item', 'Faction', 'LoreEntry']) {
    await db.$executeRawUnsafe(`ALTER TABLE "${table}" DROP COLUMN "universeId"`);
  }
  const migrations = fs.readdirSync(root).filter(name => fs.existsSync(new URL(name + '/migration.sql', root))).sort();
  assert.equal(migrations.at(-1), '20261018080000_universes', 'Update fixture explicitly when migrations change');
  for (const name of migrations.slice(0, -1)) {
    const file = new URL(name + '/migration.sql', root);
    if (!fs.existsSync(file)) continue;
    await db.$executeRawUnsafe('INSERT INTO "_prisma_migrations" (id,checksum,finished_at,migration_name,applied_steps_count) VALUES ($1,$2,now(),$3,1)', randomUUID(), createHash('sha256').update(fs.readFileSync(file)).digest('hex'), name);
  }
} finally { await db.$disconnect(); }
