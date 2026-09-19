import { ResultAsync } from 'neverthrow';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { gatewayFn } from '$lib/gateway';
import { prisma } from '@radix-bet/database';
import type { TransactionCommittedDetailsResponse } from '@radixdlt/babylon-gateway-api-sdk';

export const POST: RequestHandler = async ({ request, fetch, locals }) => {
  if (!locals.user) {
    throw error(401, 'Must be logged in to create a bet');
  }

  const body = await request.json();
  const { transactionId, description, categoryId, slug } = body;

  // If transactionId is provided, create BetExtension with metadata
  // and resolve component address from Gateway
  const txHash = transactionId || body.transactionIntentHash;
  if (!txHash) {
    throw error(400, 'transactionId is required');
  }

  // Always create BetExtension with user identity
  if (txHash) {
    try {
      await prisma.betExtension.upsert({
        where: { transactionId: txHash },
        update: {},
        create: {
          transactionId: txHash,
          description: description || null,
          categoryId: categoryId || null,
          slug: slug || null,
          userIdentityAddress: locals.user.identityAddress
        }
      });
    } catch (err) {
      console.warn('Failed to create BetExtension:', err);
    }
  }

  const gateway = gatewayFn({ fetchFn: fetch });
  const result = await ResultAsync.fromPromise(
    gateway.transaction.getCommittedDetails(txHash),
    (e: unknown) => e
  )
    .map((data: TransactionCommittedDetailsResponse) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stateUpdates = data.transaction.receipt?.state_updates as any;
      return stateUpdates?.new_global_entities || [];
    })
    .map((data: { entity_type: string; entity_address: string }[]) => {
      return {
        component: data.find((el) => el.entity_type === 'GlobalGenericComponent')?.entity_address,
        account: data.find((el) => el.entity_type === 'GlobalAccount')?.entity_address,
        options: data
          .filter((el) => el.entity_type === 'GlobalFungibleResource')
          .map((el) => el.entity_address)
      };
    });

  if (result.isOk()) {
    return json(result.value);
  }
  console.error(result.error);
  throw error(400, 'Failed to get transaction details');
};
