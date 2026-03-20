import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const testPrisma = new PrismaClient({
  adapter,
  log: ['error'],
});

/**
 * Clean test data from the database.
 * Deletes officers (and cascaded data) created by tests.
 */
export async function cleanTestData() {
  // Delete officers whose badge numbers start with 'TEST-'
  await testPrisma.officer.deleteMany({
    where: { badgeNumber: { startsWith: 'TEST-' } },
  });
}
