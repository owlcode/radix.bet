/**
 * Vote manifest builder (string template version for server-side use).
 */

import type { TransactionManifest } from '@radixdlt/radix-engine-toolkit';
import { getXrdAddress, getNetwork } from '@radix-bet/config';

export interface VoteManifestParams {
  accountAddress: string;
  componentAddress: string;
  optionName: string;
  amount: number | string;
  /** Currency resource address. Defaults to network XRD. */
  currency?: string;
}

export function buildVoteManifest(params: VoteManifestParams): TransactionManifest {
  const currency = params.currency ?? getXrdAddress(getNetwork());

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
          Address("${currency}")
          Decimal("${params.amount}")
        ;
        TAKE_ALL_FROM_WORKTOP
          Address("${currency}")
          Bucket("currency_bucket")
        ;
        CALL_METHOD
          Address("${params.componentAddress}")
          "vote"
          "${params.optionName}"
          Bucket("currency_bucket")
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
