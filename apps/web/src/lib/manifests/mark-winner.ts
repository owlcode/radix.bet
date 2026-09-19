import type { BetDefinition } from '$lib/model/bet';
import { assertValidRadixAddress } from './validation';

export const getMarkWinnerManifest = (
  bet: BetDefinition,
  winningOption: string,
  accountAddress: string,
  ownerBadge: string
) => {
  assertValidRadixAddress(bet.component, 'bet component');
  assertValidRadixAddress(accountAddress, 'account');
  assertValidRadixAddress(ownerBadge, 'owner badge');

  return {
    message: `Set winning bet for ${bet.name} on radix.bet!`,
    transactionManifest: `
                CALL_METHOD
                    Address("${accountAddress}")
                    "create_proof_of_amount"
                    Address("${ownerBadge}")
                    Decimal("1");
  
                CLAIM_COMPONENT_ROYALTIES
                    Address("${bet.component}");

                CALL_METHOD
                    Address("${accountAddress}")
                    "deposit_batch"
                    Expression("ENTIRE_WORKTOP");
  
                POP_FROM_AUTH_ZONE Proof("myproof");

                DROP_PROOF Proof("myproof");
  
                CALL_METHOD
                    Address("${accountAddress}")
                    "withdraw"
                    Address("${ownerBadge}")
                    Decimal("1");

                TAKE_FROM_WORKTOP
                    Address("${ownerBadge}")
                    Decimal("1")
                    Bucket("1");
                  
                CALL_METHOD
                    Address("${bet.component}")
                    "mark_winning_option"
                    "${winningOption}"
                    Bucket("1");
              `
  };
};
