/**
 * Database utilities for integration tests
 * Provides helpers to verify database state after transactions
 */

import { prisma } from '@radix-bet/database';

/**
 * Check if a bet exists in the database by component address
 */
export async function getBetByComponentAddress(componentAddress: string) {
  return prisma.bet.findUnique({
    where: { componentAddress },
    include: {
      options: true,
      user: true
    }
  });
}

/**
 * Check if an event log exists for a transaction
 */
export async function getEventLogByTransactionId(transactionId: string) {
  return prisma.eventLog.findFirst({
    where: { transactionId }
  });
}

/**
 * Get all event logs for a component
 */
export async function getEventLogsForComponent(componentAddress: string) {
  return prisma.eventLog.findMany({
    where: { componentAddress },
    orderBy: { processedAt: 'desc' }
  });
}

/**
 * Wait for bet to appear in database
 */
export async function waitForBetInDatabase(
  componentAddress: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<Awaited<ReturnType<typeof getBetByComponentAddress>> | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bet = await getBetByComponentAddress(componentAddress);
    if (bet) {
      return bet;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Clean up test data (for isolated tests)
 */
export async function cleanupTestBet(componentAddress: string) {
  try {
    // Delete bet options first (due to foreign key)
    await prisma.betOption.deleteMany({
      where: { componentAddress }
    });

    // Delete event logs
    await prisma.eventLog.deleteMany({
      where: { componentAddress }
    });

    // Delete bet
    await prisma.bet.delete({
      where: { componentAddress }
    });
  } catch {
    // Ignore errors if records don't exist
  }
}

/**
 * Get database connection status
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
