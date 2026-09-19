import type { PageServerLoad } from './$types';
import {
  betApiServiceFactory,
  defaultSortFor,
  transformApiBet,
  type BetStatus,
  type BetSort
} from '$lib/api/bets';
import { resolveCurrencyInfo } from '$lib/model/bet';
import { config, networkId } from '$lib/config';
import { gatewayFn } from '$lib/gateway';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

const VALID_STATUSES: BetStatus[] = ['ACTIVE', 'VOTING_CLOSED', 'ENDED'];
const VALID_SORTS: BetSort[] = ['newest', 'oldest', 'ending_soon', 'deadline_desc', 'volume'];

export const load: PageServerLoad = async ({ url, fetch }) => {
  const betApi = betApiServiceFactory({ fetchFn: fetch });

  const rawStatus = url.searchParams.get('status') ?? 'ACTIVE';
  const status: BetStatus = VALID_STATUSES.includes(rawStatus as BetStatus)
    ? (rawStatus as BetStatus)
    : 'ACTIVE';

  const rawSort = url.searchParams.get('sort') ?? defaultSortFor(status);
  const sort: BetSort = VALID_SORTS.includes(rawSort as BetSort)
    ? (rawSort as BetSort)
    : defaultSortFor(status);
  const search = url.searchParams.get('search') ?? '';

  const [betsData, stats] = await Promise.all([
    betApi.getBets({ status, sort, search: search || undefined, limit: 24 }),
    betApi.getStats()
  ]);

  const gateway = gatewayFn({ fetchFn: fetch });
  const dashboardBase =
    (networkId as number) === (RadixNetwork.Mainnet as number)
      ? 'https://dashboard.radixdlt.com'
      : 'https://stokenet-dashboard.radixdlt.com';
  const volumeEntries = stats.volumeByCurrency ?? [];
  const volumes = await Promise.all(
    volumeEntries.map(async (entry) => {
      const address = entry.currency ?? config.resources.xrd;
      const info = resolveCurrencyInfo(address, config.resources.xrd);
      const dashboardUrl = `${dashboardBase}/resource/${address}/summary`;
      if (info) {
        return { symbol: info.symbol, iconUrl: info.iconUrl, total: entry.total, dashboardUrl };
      }
      // Fetch metadata from gateway for unknown tokens
      try {
        const [entity] = await gateway.state.getEntityDetailsVaultAggregated([address]);
        const metadata = entity?.metadata?.items ?? [];
        const getName = (key: string) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata.find((m: any) => m.key === key)?.value?.typed?.value ?? '';
        return {
          symbol: getName('name') || getName('symbol') || '-',
          iconUrl: getName('icon_url') || '/icon-xrd.png',
          total: entry.total,
          dashboardUrl
        };
      } catch {
        return { symbol: '-', iconUrl: '/icon-xrd.png', total: entry.total, dashboardUrl };
      }
    })
  );

  return {
    bets: betsData.bets.map(transformApiBet),
    total: betsData.total,
    status,
    sort,
    search,
    stats: {
      volumes,
      activeBets: stats.activeBets ?? 0,
      totalVotes: stats.totalBets ?? 0
    }
  };
};
