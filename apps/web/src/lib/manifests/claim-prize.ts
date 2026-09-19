import type { BetDefinition } from '$lib/model/bet';
import { assertValidRadixAddress } from './validation';

export const getClaimPrizeManifest = (
  bet: BetDefinition,
  accountAddress: string,
  amount: string,
  optionResource: string
) => {
  assertValidRadixAddress(bet.component, 'bet component');
  assertValidRadixAddress(accountAddress, 'account');
  assertValidRadixAddress(optionResource, 'option resource');

  return {
    message: `Claim prize for ${bet.name} on radix.bet!`,
    transactionManifest: `
            CALL_METHOD
                Address("${accountAddress}")
                "withdraw"
                Address("${optionResource}")
                Decimal("${amount}");

            TAKE_FROM_WORKTOP
                Address("${optionResource}")
                Decimal("${amount}")
                Bucket("1");
            
            CALL_METHOD
                Address("${bet.component}")
                "claim_prize"
                Bucket("1");

            CALL_METHOD
                Address("${accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");`
  };
};
