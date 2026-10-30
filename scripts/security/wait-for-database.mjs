import { setTimeout } from 'node:timers/promises';
import { PrismaClient } from '../../frontend/node_modules/@prisma/client/default.js';
import { assertLocalTestTargets } from '../../frontend/scripts/local-test-targets.mjs';
assertLocalTestTargets();
for (let attempt = 1; attempt <= 60; attempt++) {
  const db = new PrismaClient();
  let ready = false;
  try {
    await db.$queryRaw`SELECT 1`;
    ready = true;
  } catch {
    // Do not print connection strings or credentials in readiness diagnostics.
    if (attempt === 60) throw new Error('Test database did not accept TCP/SQL connections within 60 attempts');
  } finally {
    await db.$disconnect();
  }
  if (ready) { console.log('Test database accepts authenticated TCP/SQL connections'); break; }
  await setTimeout(1000);
}
