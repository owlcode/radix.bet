import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ url }) => {
  const search = url.searchParams.get('search');
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const userIdentityAddress = url.searchParams.get('user');
  const sort = url.searchParams.get('sort') || 'newest';
  const address = url.searchParams.get('address');
  const status = url.searchParams.get('status');
  const slug = url.searchParams.get('slug');

  const where: Record<string, unknown> = {};

  if (address) {
    where.componentAddress = address;
  }

  if (slug) {
    where.slug = slug;
  }

  if (status) {
    if (status === 'ACTIVE') {
      // Active = deadline not passed and not resolved
      where.deadline = { gt: new Date().toISOString() };
      where.winningOptionId = null;
    } else if (status === 'VOTING_CLOSED') {
      // Waiting for resolution = deadline passed but not resolved
      where.deadline = { lte: new Date().toISOString() };
      where.winningOptionId = null;
    } else if (status === 'ENDED') {
      // Ended/Resolved = has a winner
      where.winningOptionId = { not: null };
    } else {
      where.status = status;
    }
  }

  if (userIdentityAddress) {
    where.userIdentityAddress = userIdentityAddress;
  }

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } }
    ];
  }

  // Determine sort order
  let orderBy: Record<string, string>;
  switch (sort) {
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'ending_soon':
      orderBy = { deadline: 'asc' };
      // Implicitly filter to ACTIVE only when no explicit status filter
      if (!status) {
        where.status = 'ACTIVE';
      }
      break;
    case 'deadline_desc':
      orderBy = { deadline: 'desc' };
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
      break;
  }

  const bets = await prisma.bet.findMany({
    where,
    include: {
      options: true,
      user: {
        include: {
          userAccounts: {
            include: { account: true }
          }
        }
      }
    },
    orderBy,
    take: limit,
    skip: offset
  });

  const total = await prisma.bet.count({ where });

  // Compute totalVolume and status from DB data directly (no gateway calls)
  const enrichedBets = bets.map((bet) => {
    const totalVolume = bet.options.reduce((sum, opt) => sum + parseInt(opt.totalVotes || '0'), 0);

    let enrichedStatus: 'active' | 'ended' | 'resolved' = 'active';
    if (bet.winningOptionId !== null) {
      enrichedStatus = 'resolved';
    } else if (new Date(bet.deadline) < new Date()) {
      enrichedStatus = 'ended';
    }

    const winningOptionName =
      bet.winningOptionId !== null
        ? bet.options.find((o) => o.id === bet.winningOptionId)?.name ?? null
        : null;

    return { ...bet, totalVolume, enrichedStatus, winningOptionName };
  });

  // Client-requested volume sort
  if (sort === 'volume') {
    enrichedBets.sort((a, b) => b.totalVolume - a.totalVolume);
  }

  return json({
    bets: enrichedBets,
    total,
    limit,
    offset
  });
};
