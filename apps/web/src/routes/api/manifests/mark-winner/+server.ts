import { networkId } from '$lib/config';
import {
  ManifestBuilder,
  RadixEngineToolkit,
  address,
  decimal
} from '@radixdlt/radix-engine-toolkit';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export const POST = async ({ request }: RequestEvent) => {
  const { account, ownerBadge } = await request.json();

  const manifest = new ManifestBuilder()
    .callMethod(account, 'create_proof_of_amount', [address(ownerBadge), decimal(1)])

    .build();

  const convertedInstructions = await RadixEngineToolkit.Instructions.convert(
    manifest.instructions,
    networkId,
    'String'
  );

  return json(convertedInstructions.value);
};
