import { prisma } from '../../src/lib/prisma';

export { prisma as testPrisma };

/**
 * Truncates all app tables between tests. Uses TRUNCATE ... CASCADE so FK
 * order doesn't matter. Never point this at a non-test database — the
 * integration test setup enforces DATABASE_URL comes from .env.test.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}
