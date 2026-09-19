/**
 * Shared utility for enriching bets with on-chain data from the Radix Gateway.
 * Used by both /api/bets and /me page to avoid code duplication.
 */

import type { Gateway } from '$lib/gateway';

interface BetWithOptions {
  componentAddress: string;
  deadline: string | Date;
  winningOptionId: number | string | null;
  options: { resourceAddress: string }[];
  [key: string]: unknown;
}

export type BetStatus = 'active' | 'ended' | 'resolved';

export interface EnrichedBet extends BetWithOptions {
  totalVolume: number;
  optionVotes: Record<string, number>;
  enrichedStatus: BetStatus;
}

/**
 * Enrich a list of bets with on-chain data (token supply, volume, status).
 */
export async function enrichBetsWithOnChainData<T extends BetWithOptions>(
  bets: T[],
  gateway: ReturnType<typeof Gateway>
): Promise<
  (T & { totalVolume: number; optionVotes: Record<string, number>; enrichedStatus: BetStatus })[]
> {
  return Promise.all(
    bets.map(async (bet) => {
      try {
        let totalVolume = 0;
        const optionVotes: Record<string, number> = {};

        for (const option of bet.options) {
          try {
            const optionDetails = await gateway.state.getEntityDetailsVaultAggregated(
              option.resourceAddress
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const supply = parseFloat((optionDetails as any).details?.total_supply || '0');
            optionVotes[option.resourceAddress] = supply;
            totalVolume += supply;
          } catch {
            optionVotes[option.resourceAddress] = 0;
          }
        }

        const enrichedStatus = determineBetStatus(bet);

        return { ...bet, totalVolume, optionVotes, enrichedStatus };
      } catch (error) {
        console.error(`Error enriching bet ${bet.componentAddress}:`, error);
        return {
          ...bet,
          totalVolume: 0,
          optionVotes: {},
          enrichedStatus: 'active' as BetStatus
        };
      }
    })
  );
}

/**
 * Determine bet status from deadline and winning option.
 */
export function determineBetStatus(bet: {
  deadline: string | Date;
  winningOptionId: number | string | null;
}): BetStatus {
  if (bet.winningOptionId !== null) return 'resolved';
  if (new Date(bet.deadline) < new Date()) return 'ended';
  return 'active';
}
