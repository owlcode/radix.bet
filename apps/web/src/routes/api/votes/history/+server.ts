import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/votes/history?bet=<componentAddress>
 *
 * Returns cumulative vote amounts over time per option for charting.
 * Each data point represents the running total after each vote event.
 */
export const GET: RequestHandler = async ({ url }) => {
  const betAddress = url.searchParams.get('bet');
  if (!betAddress) {
    throw error(400, 'Missing bet parameter');
  }

  const votes = await prisma.vote.findMany({
    where: { componentAddress: betAddress },
    select: {
      optionAddress: true,
      amount: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  const options = await prisma.betOption.findMany({
    where: { componentAddress: betAddress },
    select: {
      resourceAddress: true,
      name: true
    }
  });

  const optionNames = new Map(options.map((o) => [o.resourceAddress, o.name]));

  // Build cumulative time series per option
  const cumulativeByOption = new Map<string, number>();
  const series: Array<{
    timestamp: string;
    option: string;
    optionAddress: string;
    cumulative: number;
  }> = [];

  for (const vote of votes) {
    const prev = cumulativeByOption.get(vote.optionAddress) ?? 0;
    const next = prev + Number(vote.amount);
    cumulativeByOption.set(vote.optionAddress, next);

    series.push({
      timestamp: vote.createdAt.toISOString(),
      option: optionNames.get(vote.optionAddress) ?? vote.optionAddress,
      optionAddress: vote.optionAddress,
      cumulative: next
    });
  }

  return json({ series, options: options.map((o) => ({ address: o.resourceAddress, name: o.name })) });
};
