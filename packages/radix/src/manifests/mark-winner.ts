/**
 * Mark winner manifest builder.
 */

import type { TransactionManifest } from '@radixdlt/radix-engine-toolkit';

export interface MarkWinnerManifestParams {
  accountAddress: string;
  componentAddress: string;
  ownerBadgeAddress: string;
  winningOption: string;
}

export function buildMarkWinnerManifest(params: MarkWinnerManifestParams): TransactionManifest {
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
          Address("${params.ownerBadgeAddress}")
          Decimal("1")
        ;
        TAKE_ALL_FROM_WORKTOP
          Address("${params.ownerBadgeAddress}")
          Bucket("badge_bucket")
        ;
        CALL_METHOD
          Address("${params.componentAddress}")
          "mark_winning_option"
          "${params.winningOption}"
          Bucket("badge_bucket")
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
