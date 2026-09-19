import { getTokenByAddress } from '@radix-bet/config/tokens';
import { networkId } from '$lib/config';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

export const BetEventType = {
  Start: 'start',
  BettingClosed: 'betting_closed',
  End: 'end'
} as const;

export type BetEvent = {
  type: (typeof BetEventType)[keyof typeof BetEventType];
  date: string;
};

export type CurrencyInfo = {
  symbol: string;
  name: string;
  iconUrl: string;
};

export type BetDefinition = {
  disabled?: boolean;
  enrichedStatus?: 'active' | 'ended' | 'resolved';
  winningOptionName?: string | null;
  component: string;
  slug?: string;
  currency: string;
  currencyInfo?: CurrencyInfo;
  name: string;
  description?: string | null;
  category?: string;
  endsAt?: string;
  events?: BetEvent[];
  options: Record<
    string,
    {
      name: string;
      image: string;
      resourceAddress: string;
      amount?: number | string;
      color?: string;
    }
  >;
};

/** Shape returned by GET /api/bets */
export type ApiBet = {
  componentAddress: string;
  slug: string | null;
  name: string;
  description: string | null;
  currency: string | null;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  winningOptionId: number | null;
  enrichedStatus: 'active' | 'ended' | 'resolved';
  winningOptionName: string | null;
  totalVolume: number;
  options: ApiBetOption[];
};

export type ApiBetOption = {
  id: number;
  name: string;
  imageUrl: string;
  resourceAddress: string;
  totalVotes: string;
};

/** Shape returned by GET /api/bets used in search dropdowns */
export type ApiBetSearchResult = Pick<ApiBet, 'componentAddress' | 'slug' | 'name' | 'enrichedStatus'>;

/** Shape of a placed bet on the /me page */
export type PlacedBet = {
  betName: string;
  componentAddress: string;
  optionName: string;
  amount: number;
  status: string;
};

export function resolveCurrencyInfo(
  currencyAddress: string | null | undefined,
  xrdAddress: string
): CurrencyInfo | undefined {
  if (!currencyAddress) return undefined;
  const network =
    (networkId as number) === (RadixNetwork.Mainnet as number) ? 'mainnet' : 'stokenet';
  const token = getTokenByAddress(currencyAddress, network);
  if (!token) {
    // If the address is XRD but not in the registry, return a hardcoded fallback
    if (currencyAddress === xrdAddress) {
      return { symbol: 'XRD', name: 'Radix', iconUrl: '/icon-xrd.png' };
    }
    return undefined;
  }
  return { symbol: token.symbol, name: token.name, iconUrl: token.iconUrl };
}
