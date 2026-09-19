/**
 * Create bet manifest builder.
 * Consolidates from event-processor and integration-tests.
 *
 * Note: The event-processor passes `1u8` as a final argument to create_bet
 * (for required_verifications), while integration tests omit it. The Scrypto
 * contract accepts it as an optional parameter with a default of 1, so we
 * include it for consistency.
 */

import type { TransactionManifest } from '@radixdlt/radix-engine-toolkit';
import { getXrdAddress, getNetwork } from '@radix-bet/config';

export interface CreateBetParams {
  accountAddress: string;
  packageAddress: string;
  betName: string;
  optionNames: string[];
  optionImages: string[];
  deadlineUnixSeconds: number;
  /** XRD resource address override. Defaults to network XRD. */
  xrdAddress?: string;
}

export function buildCreateBetManifest(params: CreateBetParams): TransactionManifest {
  const xrd = params.xrdAddress ?? getXrdAddress(getNetwork());
  const names = params.optionNames.map((n) => `"${n}"`).join(', ');
  const images = params.optionImages.map((i) => `"${i}"`).join(', ');

  return {
    instructions: {
      kind: 'String',
      value: `
        CALL_METHOD
          Address("${params.accountAddress}")
          "lock_fee"
          Decimal("50")
        ;
        CALL_FUNCTION
          Address("${params.packageAddress}")
          "PublicBetMultipleWinners"
          "create_bet"
          Address("${xrd}")
          Array<String>(${names})
          Array<String>(${images})
          "${params.betName}"
          ${params.deadlineUnixSeconds}i64
          1u8
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
