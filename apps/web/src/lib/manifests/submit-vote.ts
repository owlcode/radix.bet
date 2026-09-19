import type { BetDefinition } from '$lib/model/bet';
import { assertValidRadixAddress } from './validation';

export const getSubmitVoteManifest = (
  bet: BetDefinition,
  winningOption: string,
  accountAddress: string,
  verifierBadge: string
) => {
  assertValidRadixAddress(bet.component, 'bet component');
  assertValidRadixAddress(accountAddress, 'account');
  assertValidRadixAddress(verifierBadge, 'verifier badge');

  return {
    message: `Submit verifier vote for ${bet.name} on radix.bet!`,
    transactionManifest: `
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_amount"
  Address("${verifierBadge}")
  Decimal("1")
;
POP_FROM_AUTH_ZONE
  Proof("verifier_proof")
;
CALL_METHOD
  Address("${bet.component}")
  "submit_winner_vote"
  "${winningOption}"
  Proof("verifier_proof")
;
`
  };
};
