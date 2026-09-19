import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { gatewayFn } from '$lib/gateway';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ locals, fetch }) => {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  const userIdentityAddress = locals.user.identityAddress;

  // Fetch linked accounts
  const userAccountLinks = await prisma.userAccount.findMany({
    where: { identityAddress: userIdentityAddress },
    include: { account: true }
  });
  const userAccounts = userAccountLinks.map((ua) => ua.account);
  const accountAddresses = userAccounts.map((a) => a.address);

  // Check if any linked account holds the package owner badge
  let packageRoyaltiesAccount: string | null = null;
  let packageOwnerBadgeNftId: string | null = null;

  if (accountAddresses.length > 0) {
    try {
      const gateway = gatewayFn({ fetchFn: fetch });
      const details = await gateway.state.getEntityDetailsVaultAggregated(accountAddresses);
      for (const entity of details) {
        const nftResource = entity.non_fungible_resources.items.find(
          (item) => item.resource_address === config.packageOwnerBadge
        );
        if (nftResource) {
          const localId = nftResource.vaults.items[0]?.items?.[0];
          if (localId) {
            packageRoyaltiesAccount = entity.address;
            packageOwnerBadgeNftId = localId;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Failed to check package owner badge:', e);
    }
  }

  // Fetch bets created by this user
  const betsCreated = await prisma.bet.findMany({
    where: { userIdentityAddress },
    include: { options: true },
    orderBy: { createdAt: 'desc' }
  });

  const enrichedBets = betsCreated.map((bet) => {
    const totalVolume = bet.options.reduce((sum, opt) => sum + parseInt(opt.totalVotes || '0'), 0);
    const optionVotes: Record<string, number> = {};
    for (const opt of bet.options) {
      optionVotes[opt.resourceAddress] = parseInt(opt.totalVotes || '0');
    }

    let enrichedStatus: 'active' | 'ended' | 'resolved' = 'active';
    if (bet.winningOptionId !== null) {
      enrichedStatus = 'resolved';
    } else if (new Date(bet.deadline) < new Date()) {
      enrichedStatus = 'ended';
    }

    return { ...bet, totalVolume, optionVotes, enrichedStatus };
  });

  // Fetch placed bets — include votes from identity AND all linked accounts
  const voteIntents = await prisma.voteIntent.findMany({
    where: {
      OR: [
        { identityAddress: userIdentityAddress },
        ...(accountAddresses.length > 0 ? [{ accountAddress: { in: accountAddresses } }] : [])
      ],
      matched: true
    },
    include: {
      vote: {
        include: {
          bet: true,
          option: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const placedBets = voteIntents
    .filter((vi) => vi.vote)
    .map((vi) => {
      const vote = vi.vote!;
      const bet = vote.bet;
      const option = vote.option;

      let status = 'active';
      if (bet.winningOptionId !== null) {
        status = bet.winningOptionId === option.id ? 'won' : 'lost';
      } else if (new Date(bet.deadline) < new Date()) {
        status = 'ended';
      }

      return {
        betName: bet.name,
        componentAddress: bet.componentAddress,
        optionName: option.name,
        amount: Number(vote.amount),
        status
      };
    });

  // Compute stats
  const activeBetsCount = placedBets.filter((b) => b.status === 'active').length;
  const betsCreatedCount = enrichedBets.length;
  const totalWagered = placedBets.reduce((sum, b) => sum + b.amount, 0);
  const createdMarketVolume = enrichedBets.reduce((sum, b) => sum + b.totalVolume, 0);

  const wonCount = placedBets.filter((b) => b.status === 'won').length;
  const lostCount = placedBets.filter((b) => b.status === 'lost').length;
  const resolvedCount = wonCount + lostCount;
  const winRate = resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : null;

  return {
    user: locals.user,
    identityAddress: userIdentityAddress,
    betsCreated: enrichedBets,
    placedBets,
    stats: {
      activeBetsCount,
      totalWagered,
      betsCreated: betsCreatedCount,
      winRate,
      createdMarketVolume
    },
    packageRoyaltiesAccount,
    packageOwnerBadgeNftId
  };
};
