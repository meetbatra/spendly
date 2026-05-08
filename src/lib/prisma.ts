import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { Pool } from 'pg';

const runtimeDatabaseUrl = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
  pool: Pool | null | undefined;
};

let pool: Pool | null = null;
let prisma: PrismaClient | null = null;

if (runtimeDatabaseUrl) {
  pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: runtimeDatabaseUrl,
      // Prisma v7 uses the driver pool defaults; set explicit timeouts to avoid hanging connects.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 300_000,
    });

  const adapter = new PrismaPg(pool);

  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
}

export { prisma };

export function getPrisma(): PrismaClient {
  if (!runtimeDatabaseUrl || !prisma) {
    throw new Error('Missing DATABASE_URL for Prisma runtime client');
  }
  return prisma;
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
