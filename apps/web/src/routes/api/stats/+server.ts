import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async () => {
  const [totalBets, activeBets, totalUsers, totalComments, volumeResult] = await Promise.all([
    prisma.bet.count(),
    prisma.bet.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.$queryRaw<{ currency: string | null; total: bigint }[]>`
      SELECT b."currency", COALESCE(SUM(CAST(bo."totalVotes" AS BIGINT)), 0) as total
      FROM "BetOption" bo
      JOIN "Bet" b ON bo."componentAddress" = b."componentAddress"
      GROUP BY b."currency"
    `
  ]);

  const volumeByCurrency = volumeResult.map((row) => ({
    currency: row.currency,
    total: row.total.toString()
  }));

  return json({
    totalBets,
    activeBets,
    totalUsers,
    totalComments,
    volumeByCurrency
  });
};
