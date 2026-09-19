/**
 * Claim prize manifest builder.
 */

import type { TransactionManifest } from '@radixdlt/radix-engine-toolkit';

export interface ClaimPrizeManifestParams {
  accountAddress: string;
  componentAddress: string;
  optionTokenAddress: string;
  amount: number | string;
}

export function buildClaimPrizeManifest(params: ClaimPrizeManifestParams): TransactionManifest {
  return {
    instructions: {
      kind: 'String',
      value: `
        CALL_METHOD
          Address("${params.accountAddress}")
          "lock_fee"
          Decimal("50")
        ;
        CALL_METHOD
          Address("${params.accountAddress}")
          "withdraw"
          Address("${params.optionTokenAddress}")
          Decimal("${params.amount}")
        ;
        TAKE_ALL_FROM_WORKTOP
          Address("${params.optionTokenAddress}")
          Bucket("option_bucket")
        ;
        CALL_METHOD
          Address("${params.componentAddress}")
          "claim_prize"
          Bucket("option_bucket")
        ;
        CALL_METHOD
          Address("${params.accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP")
        ;
      `
    },
    blobs: []
  };
}
