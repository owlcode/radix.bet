import type { PageLoad } from './$types';
import type { BetDefinition } from '$lib/model/bet';
import { isValidRadixAddress } from '$lib/manifests/validation';
import { gatewayFn } from '$lib/gateway';
import { betApiServiceFactory, transformApiBet } from '$lib/api/bets';

export type ComponentStatus = {
  ownerBadge: string;
  verifierBadge: string;
  winningOption: string;
  requiredVerifications: number;
};

export const load: PageLoad = async ({ params, fetch }) => {
  const betApi = betApiServiceFactory({ fetchFn: fetch });

  let bet: BetDefinition | undefined;
  let description: string | undefined;
  let isOnChain = true;
  let resolvedAddress = params.address;

  const isAddress =
    params.address.startsWith('component_') || params.address.startsWith('account_');

  try {
    const query = isAddress
      ? { limit: 1, address: params.address }
      : { limit: 1, slug: params.address };
    const data = await betApi.getBets(query);

    const apiBet = (data.bets || [])[0];
    if (apiBet) {
      resolvedAddress = apiBet.componentAddress;
      bet = transformApiBet(apiBet);
      description = apiBet.description ?? undefined;
      isOnChain = isValidRadixAddress(apiBet.componentAddress);
    }
  } catch {
    // Fall through — bet stays undefined
  }

  // Resolve currency info for non-XRD tokens not in the static registry
  if (bet && !bet.currencyInfo) {
    try {
      const info = await betApi.getTokenInfo(bet.currency);
      bet = { ...bet, currencyInfo: info };
    } catch {
      // Leave currencyInfo undefined — UI shows XRD fallback
    }
  }

  const pendingConfirmation = !bet && isValidRadixAddress(resolvedAddress);

  const defaultStatus: ComponentStatus = {
    ownerBadge: '',
    verifierBadge: '',
    winningOption: '',
    requiredVerifications: 1
  };

  let statusPromise: Promise<ComponentStatus> = Promise.resolve(defaultStatus);
  let creatorPromise: Promise<string[]> = Promise.resolve([]);

  if (isOnChain && isValidRadixAddress(resolvedAddress)) {
    const gateway = gatewayFn({ fetchFn: fetch });
    statusPromise = gateway.state
      .getEntityDetailsVaultAggregated(resolvedAddress)
      .then((entity) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = (entity as any).details?.state;
        console.log('[bet-page] component state for', resolvedAddress, JSON.stringify(state, null, 2));
        if (!state?.fields) {
          console.warn('[bet-page] No state.fields found, returning defaultStatus');
          return defaultStatus;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fields: Array<{ field_name?: string; value?: any }> = state.fields;
        const byName = (name: string) => fields.find((f) => f.field_name === name)?.value ?? '';

        const status = {
          ownerBadge: String(byName('owner_badge')),
          verifierBadge: String(byName('verifier_badge')),
          winningOption: String(byName('winner')),
          requiredVerifications: Number(byName('required_verifications') || 1)
        };
        console.log('[bet-page] parsed status:', JSON.stringify(status));
        return status;
      })
      .catch((err) => {
        console.error('[bet-page] Failed to fetch component state:', err);
        return defaultStatus;
      });

    creatorPromise = statusPromise
      .then((s) => {
        console.log('[bet-page] ownerBadge for getResourceHolders:', s.ownerBadge || '(empty)');
        return s.ownerBadge ? gateway.getResourceHolders(s.ownerBadge) : [];
      })
      .then((holders) => {
        console.log('[bet-page] resourceHolders result:', holders);
        return holders;
      })
      .catch((err) => {
        console.error('[bet-page] Failed to fetch resource holders:', err);
        return [];
      });
  } else {
    console.log('[bet-page] Skipping gateway queries: isOnChain=%s, resolvedAddress=%s, isValidAddress=%s',
      isOnChain, resolvedAddress, isValidRadixAddress(resolvedAddress));
  }

  return {
    address: resolvedAddress,
    bet: bet as BetDefinition,
    description,
    isOnChain,
    pendingConfirmation,
    status: statusPromise,
    creator: creatorPromise
  };
};
