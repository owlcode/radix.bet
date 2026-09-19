import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import type { RequestEvent, RequestHandler } from './$types';
import { keyBy } from 'lodash-es';
import type { SignedChallenge, Account } from '@radixdlt/radix-dapp-toolkit';
import { ApiErrorCode, createApiError, handleApiResponse } from '$lib/server/helpers';
import { error } from '@sveltejs/kit';

// Type for parsed WalletData - matches the schema output
interface ParsedWalletData {
  accounts: Account[];
  proofs: SignedChallenge[];
  personaData: unknown[];
  persona?: { identityAddress: string; label: string } | undefined;
}

const isProofPayload = (value: unknown): value is SignedChallenge => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const proof = value as Record<string, unknown>;
  return (
    typeof proof.address === 'string' &&
    typeof proof.challenge === 'string' &&
    typeof proof.type === 'string'
  );
};

const isAccountPayload = (value: unknown): value is Account => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const account = value as Record<string, unknown>;
  return typeof account.address === 'string';
};

const parseWalletDataPayload = (value: unknown): ParsedWalletData | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const accounts = Array.isArray(payload.accounts)
    ? payload.accounts.filter(isAccountPayload)
    : undefined;
  const proofs = Array.isArray(payload.proofs) ? payload.proofs.filter(isProofPayload) : undefined;

  if (!accounts || !proofs || accounts.length === 0 || proofs.length === 0) {
    return null;
  }

  const accountAddresses = new Set(accounts.map((account) => account.address));
  const allProofAddressesPresent = proofs.every((proof) => accountAddresses.has(proof.address));
  if (!allProofAddressesPresent) {
    return null;
  }

  return {
    accounts,
    proofs,
    personaData: Array.isArray(payload.personaData) ? payload.personaData : [],
    persona:
      payload.persona && typeof payload.persona === 'object'
        ? (payload.persona as ParsedWalletData['persona'])
        : undefined
  };
};

export const POST: RequestHandler = async ({ request, locals }: RequestEvent) => {
  if (!locals.user) return error(403);

  return handleApiResponse(() =>
    ResultAsync.fromPromise(
      request.json().then((d) => parseWalletDataPayload(d)),
      (e: unknown) => createApiError(ApiErrorCode.Generic)(e)
    )
      .andThen((data) =>
        data
          ? okAsync(data)
          : errAsync(createApiError(ApiErrorCode.Generic)('Invalid wallet data payload'))
      )
      .andThen((data: ParsedWalletData) =>
        ResultAsync.fromPromise(
          Promise.all(
            data.proofs.map(async (proof) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result = await locals.rola.verifySignedChallenge(proof as any);
              if (result.isErr()) throw result.error;
              return result.value;
            })
          ),
          (e: unknown) => e
        ).andThen(() => {
          const addresses = keyBy(data.accounts, 'address');
          const input = data.proofs.map((proof) => addresses[proof.address]);
          return locals.userModel.linkAccounts(locals.user.identityAddress, input);
        })
      )
      .map(() => ({
        httpResponseCode: 200
      }))
      .mapErr((err: unknown) => createApiError(ApiErrorCode.Generic)(err))
  );
};
