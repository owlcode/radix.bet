import {
  DataRequestBuilder,
  RadixDappToolkit,
  type WalletDataStateAccount
} from '@radixdlt/radix-dapp-toolkit';
import { invalidateAll } from '$app/navigation';
import { writable } from 'svelte/store';
import { config, networkId } from '$lib/config';
import { http } from '$lib/http';

export const account = writable<WalletDataStateAccount>();
export const accounts = writable<WalletDataStateAccount[]>([]);
export const rdt = writable<RadixDappToolkit>();

export const clearRdtLocalStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('rdt:')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const logger = {
  ...console,
  getSubLogger: () => logger
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

export const initRdt = () => {
  const _rdt = RadixDappToolkit({
    networkId,
    dAppDefinitionAddress: config.dAppDefinitionAddress,
    applicationName: config.applicationName,
    logger,
    applicationVersion: '1.0.0'
  });

  rdt.set(_rdt);

  _rdt.walletApi.setRequestData(
    DataRequestBuilder.persona().withProof(),
    DataRequestBuilder.accounts().atLeast(1).withProof()
  );

  _rdt.walletApi.provideChallengeGenerator(() => http.get<string>('/api/auth/challenge'));

  _rdt.walletApi.provideConnectResponseCallback(async (walletResponse) => {
    if (walletResponse.isOk()) {
      await http.post('/api/auth/login', walletResponse.value.proofs);
    }
  });

  let hadConnectedWallet = false;

  const onWalletDisconnected = async () => {
    try {
      await http.post('/api/auth/logout', {});
    } finally {
      clearRdtLocalStorage();
      await invalidateAll();
    }
  };

  const walletSubscription = _rdt.walletApi.walletData$.subscribe((data) => {
    const hasConnectedWallet = data.accounts.length > 0;
    account.set(data.accounts[0]);
    accounts.set(data.accounts);

    if (hasConnectedWallet) {
      hadConnectedWallet = true;
      return;
    }

    if (hadConnectedWallet && !hasConnectedWallet) {
      hadConnectedWallet = false;
      void onWalletDisconnected();
    }
  });

  return () => {
    walletSubscription.unsubscribe();
    _rdt.destroy();
  };
};
