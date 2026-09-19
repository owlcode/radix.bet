import type { LayoutServerLoad } from './$types';
import { networkId } from '$lib/config';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

export const load: LayoutServerLoad = ({ locals }) => {
  return {
    user: locals.user,
    isLoggedIn: !!locals.user,
    isStokenet: (networkId as number) !== (RadixNetwork.Mainnet as number)
  };
};
