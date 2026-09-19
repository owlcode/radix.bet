/**
 * Submit verifier vote manifest builder.
 * The verifier creates a proof of their badge and calls submit_winner_vote.
 */

export interface SubmitVoteManifestParams {
  accountAddress: string;
  componentAddress: string;
  verifierBadge: string;
  winningOption: string;
}

/**
 * Returns a manifest string and wallet message for the submit verifier vote transaction.
 * This is used by the web app via Radix Dapp Toolkit (not server-side submission).
 */
export function buildSubmitVoteManifest(params: SubmitVoteManifestParams): {
  message: string;
  transactionManifest: string;
} {
  return {
    message: `Submit verifier vote on radix.bet!`,
    transactionManifest: `
CALL_METHOD
  Address("${params.accountAddress}")
  "create_proof_of_amount"
  Address("${params.verifierBadge}")
  Decimal("1")
;
POP_FROM_AUTH_ZONE
  Proof("verifier_proof")
;
CALL_METHOD
  Address("${params.componentAddress}")
  "submit_winner_vote"
  "${params.winningOption}"
  Proof("verifier_proof")
;
`
  };
}
