import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

const SYSTEM_IDENTITY = 'identity_system_unlinked_bets';
const ORACLE_DISPLAY_LABEL = 'RadixBet Oracle';

export const GET: RequestHandler = async () => {
  // Single query: get users with bet counts, ordered by total bets
  const users = await prisma.user.findMany({
    where: {
      bets: { some: {} }
    },
    include: {
      userAccounts: {
        take: 1,
        include: { account: true }
      },
      _count: {
        select: { bets: true }
      }
    },
    take: 50,
    orderBy: {
      bets: { _count: 'desc' }
    }
  });

  // Single groupBy query to get status counts for all users at once (fixes N+1)
  const statusCounts = await prisma.bet.groupBy({
    by: ['userIdentityAddress', 'status'],
    where: {
      userIdentityAddress: { in: users.map((u) => u.identityAddress) }
    },
    _count: true
  });

  // Build a lookup map: userIdentityAddress -> { ACTIVE: n, RESOLVED: n }
  const countMap = new Map<string, { active: number; resolved: number }>();
  for (const row of statusCounts) {
    const entry = countMap.get(row.userIdentityAddress) ?? { active: 0, resolved: 0 };
    if (row.status === 'ACTIVE') entry.active = row._count;
    else if (row.status === 'RESOLVED') entry.resolved = row._count;
    countMap.set(row.userIdentityAddress, entry);
  }

  const leaderboard = users.map((user) => {
    const counts = countMap.get(user.identityAddress) ?? { active: 0, resolved: 0 };
    const firstAccount = user.userAccounts[0]?.account;
    const displayAddress = firstAccount?.address || user.identityAddress;
    const isOracle = user.identityAddress === SYSTEM_IDENTITY;
    const displayLabel = isOracle ? ORACLE_DISPLAY_LABEL : (firstAccount?.label || undefined);

    return {
      identityAddress: user.identityAddress,
      displayAddress,
      displayLabel,
      betsCreated: user._count.bets,
      activeBets: counts.active,
      resolvedBets: counts.resolved,
      joinedAt: user.createdAt
    };
  });

  return json({ leaderboard });
};
