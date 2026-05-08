import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { Pool } from 'pg';

const runtimeDatabaseUrl = process.env.DATABASE_URL;

if (!runtimeDatabaseUrl) {
  throw new Error('Missing DATABASE_URL for Prisma runtime client');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create the connection pool
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: runtimeDatabaseUrl,
    // Prisma v7 uses the driver pool defaults; set explicit timeouts to avoid hanging connects.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 300_000,
  });

// Setup the adapter
const adapter = new PrismaPg(pool);

// Initialize PrismaClient with the adapter
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
