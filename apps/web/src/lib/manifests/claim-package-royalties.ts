import { assertValidRadixAddress } from './validation';

export const getClaimPackageRoyaltiesManifest = (
  packageAddress: string,
  packageOwnerBadge: string,
  accountAddress: string,
  nftLocalId: string
) => {
  assertValidRadixAddress(packageAddress, 'package');
  assertValidRadixAddress(packageOwnerBadge, 'package owner badge');
  assertValidRadixAddress(accountAddress, 'account');

  return {
    message: 'Claim package royalties on radix.bet',
    transactionManifest: `
      CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_non_fungibles"
          Address("${packageOwnerBadge}")
          Array<NonFungibleLocalId>(NonFungibleLocalId("${nftLocalId}"));

      CLAIM_PACKAGE_ROYALTIES
          Address("${packageAddress}");

      CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
    `
  };
};
