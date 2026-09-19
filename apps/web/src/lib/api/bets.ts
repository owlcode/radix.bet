import { apiServiceFactory } from './index';
import { config } from '$lib/config';
import {
  resolveCurrencyInfo,
  BetEventType,
  type ApiBet,
  type BetDefinition,
  type BetEvent,
  type CurrencyInfo
} from '$lib/model/bet';

export type BetStatus = 'ACTIVE' | 'VOTING_CLOSED' | 'ENDED';
export type BetSort = 'newest' | 'oldest' | 'ending_soon' | 'deadline_desc' | 'volume';

export type GetBetsParams = {
  status?: BetStatus;
  sort?: BetSort;
  search?: string;
  limit?: number;
  offset?: number;
  address?: string;
  slug?: string;
  user?: string;
};

export type GetBetsResponse = {
  bets: ApiBet[];
  total: number;
  limit: number;
  offset: number;
};

export type VolumeEntry = {
  currency: string | null;
  total: string;
};

export type StatsResponse = {
  volumeByCurrency: VolumeEntry[];
  activeBets: number;
  totalBets: number;
};

export type ActivityParams = {
  limit?: number;
  betAddress?: string;
};

/** Returns the default sort order for a given status tab */
export function defaultSortFor(status: BetStatus | undefined): BetSort {
  if (status === 'VOTING_CLOSED') return 'deadline_desc';
  if (status === 'ENDED') return 'volume';
  return 'ending_soon';
}

/** Converts a raw API bet into a fully typed BetDefinition for the UI.
 *  null currency is treated as XRD per the DB schema convention. */
export function transformApiBet(apiBet: ApiBet): BetDefinition {
  const xrdAddress = config.resources.xrd;
  const currencyAddress = apiBet.currency || xrdAddress;

  const options: BetDefinition['options'] = {};
  for (const opt of apiBet.options || []) {
    options[opt.resourceAddress] = {
      name: opt.name,
      image: opt.imageUrl,
      resourceAddress: opt.resourceAddress,
      amount: opt.totalVotes || '0'
    };
  }

  const events: BetEvent[] = [];
  if (apiBet.createdAt) events.push({ type: BetEventType.Start, date: apiBet.createdAt });
  if (apiBet.deadline) events.push({ type: BetEventType.BettingClosed, date: apiBet.deadline });
  if (apiBet.winningOptionId !== null && apiBet.updatedAt) {
    events.push({ type: BetEventType.End, date: apiBet.updatedAt });
  }

  return {
    component: apiBet.componentAddress,
    slug: apiBet.slug || undefined,
    currency: currencyAddress,
    currencyInfo: resolveCurrencyInfo(currencyAddress, xrdAddress),
    name: apiBet.name,
    description: apiBet.description,
    disabled: apiBet.enrichedStatus !== 'active',
    enrichedStatus: apiBet.enrichedStatus,
    winningOptionName: apiBet.winningOptionName || null,
    endsAt: apiBet.deadline,
    events,
    options
  };
}

export const betApiServiceFactory = ({ fetchFn }: { fetchFn: typeof fetch }) => {
  const api = apiServiceFactory({ fetchFn });

  return {
    getBets: (params: GetBetsParams = {}): Promise<GetBetsResponse> =>
      api.get<GetBetsResponse>('/api/bets', {
        status: params.status,
        sort: params.sort,
        search: params.search,
        limit: params.limit !== undefined ? String(params.limit) : undefined,
        offset: params.offset !== undefined ? String(params.offset) : undefined,
        address: params.address,
        slug: params.slug,
        user: params.user
      }),

    getStats: (): Promise<StatsResponse> =>
      api.get<StatsResponse>('/api/stats'),

    getTokenInfo: (address: string): Promise<CurrencyInfo> =>
      api.get<CurrencyInfo>(`/api/token-info/${address}`),

    getCategories: () =>
      api.get('/api/categories'),

    getActivity: (params: ActivityParams = {}) =>
      api.get('/api/activity', {
        limit: params.limit !== undefined ? String(params.limit) : undefined,
        betAddress: params.betAddress
      }),

    postManifestVote: <T>(body: unknown): Promise<T> =>
      api.post<T>('/api/manifests/vote', body),

    postManifestMarkWinner: <T>(body: unknown): Promise<T> =>
      api.post<T>('/api/manifests/mark-winner', body),

    transformApiBet
  };
};

export type BetApiService = ReturnType<typeof betApiServiceFactory>;
