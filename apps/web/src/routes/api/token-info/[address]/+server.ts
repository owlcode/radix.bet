import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { gatewayFn } from '$lib/gateway';
import { isValidRadixAddress } from '$lib/manifests/validation';

export const GET = async ({ params, fetch }: RequestEvent) => {
	const resourceAddress = params.address;

	if (!isValidRadixAddress(resourceAddress)) {
		throw error(400, `Invalid resource address: "${resourceAddress}"`);
	}

	const gateway = gatewayFn({ fetchFn: fetch });

	try {
		const [entity] = await gateway.state.getEntityDetailsVaultAggregated([resourceAddress]);
		const metadata = entity?.metadata?.items ?? [];

		const getName = (key: string) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			metadata.find((m: any) => m.key === key)?.value?.typed?.value ?? '';

		return json({
			address: resourceAddress,
			symbol: getName('symbol') || 'TOKEN',
			name: getName('name') || 'Unknown Token',
			iconUrl: getName('icon_url') || '/icon-xrd.png'
		});
	} catch {
		return json({
			address: resourceAddress,
			symbol: 'TOKEN',
			name: 'Unknown Token',
			iconUrl: '/icon-xrd.png'
		});
	}
};
