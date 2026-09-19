import { networkId } from '$lib/config';
import {
  ManifestBuilder,
  RadixEngineToolkit,
  address,
  bucket,
  str,
  decimal,
  expression
} from '@radixdlt/radix-engine-toolkit';
import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { isValidRadixAddress } from '$lib/manifests/validation';
import { prisma } from '$lib/server/prisma';

export const POST = async ({ request, locals }: RequestEvent) => {
  const data = await request.json();

  if (!locals.user) {
    throw error(401, 'Must be logged in to vote');
  }

  if (!isValidRadixAddress(data.bet?.component)) {
    throw error(
      400,
      `Invalid component address: "${data.bet?.component}". This bet does not exist on-chain.`
    );
  }
  if (!isValidRadixAddress(data.payer)) {
    throw error(400, `Invalid account address: "${data.payer}".`);
  }
  if (!isValidRadixAddress(data.bet?.currency)) {
    throw error(
      400,
      `This bet has no known currency. It may not have been fully indexed yet — please try again later.`
    );
  }

  const manifest = new ManifestBuilder()
    .callMethod(data.payer, 'withdraw', [address(data.bet.currency), decimal(data.amount)])
    .takeAllFromWorktop(data.bet.currency, (builder, bucketId) =>
      builder.callMethod(data.bet.component, 'vote', [str(data.option), bucket(bucketId)])
    )
    .callMethod(data.payer, 'deposit_batch', [expression('EntireWorktop')])
    .build();

  const convertedInstructions = await RadixEngineToolkit.Instructions.convert(
    manifest.instructions,
    networkId,
    'String'
  );

  // Create VoteIntent — user is always authenticated
  const voteIntent = await prisma.voteIntent.create({
    data: {
      identityAddress: locals.user.identityAddress,
      accountAddress: data.payer,
      componentAddress: data.bet.component,
      optionResourceAddress: data.option,
      amount: String(data.amount)
    }
  });

  return json({ manifest: convertedInstructions.value, voteIntentId: voteIntent.id });
};
