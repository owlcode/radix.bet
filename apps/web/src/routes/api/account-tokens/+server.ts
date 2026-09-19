import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { gatewayFn } from '$lib/gateway';
import { config } from '$lib/config';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const accountsParam = url.searchParams.get('accounts');
  if (!accountsParam) {
    throw error(400, 'accounts parameter is required');
  }

  const accounts = accountsParam.split(',').filter(Boolean);
  if (accounts.length === 0) {
    throw error(400, 'At least one account address is required');
  }

  const gateway = gatewayFn({ fetchFn: fetch });

  // Fetch all account details
  const accountResponses = await Promise.all(
    accounts.map((addr) =>
      gateway.state.getEntityDetailsVaultAggregated(addr).catch(() => null)
    )
  );

  // Collect all unique fungible resource addresses
  const resourceAddresses = new Set<string>();
  for (const entity of accountResponses) {
    if (!entity) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vaults = (entity as any).fungible_resources?.items || [];
    for (const vault of vaults) {
      if (vault.resource_address) {
        resourceAddresses.add(vault.resource_address);
      }
    }
  }

  if (resourceAddresses.size === 0) {
    return json({ tokens: [] });
  }

  // Fetch metadata for all tokens
  const tokenAddrs = Array.from(resourceAddresses);
  const metadataResponses = await Promise.all(
    tokenAddrs.map((addr) =>
      gateway.state.getEntityDetailsVaultAggregated(addr).catch(() => null)
    )
  );

  // Extract metadata and build token list
  const tokens: { address: string; name: string; symbol: string; iconUrl: string }[] = [];

  for (let i = 0; i < tokenAddrs.length; i++) {
    const addr = tokenAddrs[i];
    const entity = metadataResponses[i];
    let name = 'Unknown Token';
    let symbol = 'TOKEN';
    let iconUrl = '';

    if (entity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (entity as any).metadata?.items || [];
      for (const item of metadata) {
        if (item.key === 'name' && item.value?.typed?.value) {
          name = item.value.typed.value;
        }
        if (item.key === 'symbol' && item.value?.typed?.value) {
          symbol = item.value.typed.value;
        }
        if (item.key === 'icon_url' && item.value?.typed?.value) {
          iconUrl = item.value.typed.value;
        }
      }
    }

    tokens.push({ address: addr, name, symbol, iconUrl });
  }

  // XRD first, then alphabetical
  tokens.sort((a, b) => {
    if (a.address === config.resources.xrd) return -1;
    if (b.address === config.resources.xrd) return 1;
    return a.name.localeCompare(b.name);
  });

  return json({ tokens });
};
