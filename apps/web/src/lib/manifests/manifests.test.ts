import { describe, it, expect } from 'vitest';
import { isValidRadixAddress, assertValidRadixAddress } from './validation';
import { getClaimPrizeManifest } from './claim-prize';
import { getMarkWinnerManifest } from './mark-winner';
import { getSubmitVoteManifest } from './submit-vote';
import { getClaimPackageRoyaltiesManifest } from './claim-package-royalties';
import type { BetDefinition } from '$lib/model/bet';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const VALID_COMPONENT = 'component_tdx_2_1cpae5ydf6cvw464l9cvhze0h9llllnsvpmaw86ezcqs6s5putfmwzl';
const VALID_ACCOUNT = 'account_tdx_2_129dfv62smwl4kxq8xc47ncee2nw4c5pc6savcs8sfquw89ct9pvja5';
const VALID_RESOURCE = 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
const VALID_PACKAGE = 'package_tdx_2_1p5rwekl2l3ehwhws53cl37vf6wqtxjudr9a2krtvlquk80y84zjqay';

const INVALID_AUTO_ADDRESS = 'component_tdx_2_auto_espn_baseball_401833067';
const INVALID_AUTO_ADDRESS_2 = 'component_tdx_2_auto_espn_football_123456';
const INVALID_SEED_ADDRESS = 'component_tdx_2_seed_test123';

function makeBet(overrides?: Partial<BetDefinition>): BetDefinition {
  return {
    component: VALID_COMPONENT,
    currency: VALID_RESOURCE,
    name: 'Test Bet',
    options: {
      [VALID_RESOURCE]: {
        name: 'Option A',
        image: '',
        resourceAddress: VALID_RESOURCE
      }
    },
    ...overrides
  };
}

// ─── Address Validation ─────────────────────────────────────────────────────

describe('isValidRadixAddress', () => {
  it('accepts valid component addresses', () => {
    expect(isValidRadixAddress(VALID_COMPONENT)).toBe(true);
  });

  it('accepts valid account addresses', () => {
    expect(isValidRadixAddress(VALID_ACCOUNT)).toBe(true);
  });

  it('accepts valid resource addresses', () => {
    expect(isValidRadixAddress(VALID_RESOURCE)).toBe(true);
  });

  it('accepts valid package addresses', () => {
    expect(isValidRadixAddress(VALID_PACKAGE)).toBe(true);
  });

  it('rejects auto-generated sports bet addresses', () => {
    expect(isValidRadixAddress(INVALID_AUTO_ADDRESS)).toBe(false);
  });

  it('rejects auto-generated football bet addresses', () => {
    expect(isValidRadixAddress(INVALID_AUTO_ADDRESS_2)).toBe(false);
  });

  it('rejects seed bet addresses', () => {
    expect(isValidRadixAddress(INVALID_SEED_ADDRESS)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidRadixAddress('')).toBe(false);
  });

  it('rejects null/undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidRadixAddress(null as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidRadixAddress(undefined as any)).toBe(false);
  });

  it('rejects random strings', () => {
    expect(isValidRadixAddress('hello_world')).toBe(false);
    expect(isValidRadixAddress('not_an_address')).toBe(false);
  });

  it('rejects addresses with wrong prefix', () => {
    expect(isValidRadixAddress('foo_tdx_2_1abc')).toBe(false);
  });

  it('rejects addresses that are too short', () => {
    expect(isValidRadixAddress('component_tdx_2_1a')).toBe(false);
  });

  it('rejects addresses with invalid bech32m chars (uppercase)', () => {
    expect(isValidRadixAddress('component_tdx_2_1ABCDEFG')).toBe(false);
  });
});

describe('assertValidRadixAddress', () => {
  it('does not throw for valid addresses', () => {
    expect(() => assertValidRadixAddress(VALID_COMPONENT, 'test')).not.toThrow();
  });

  it('throws with descriptive message for auto-generated addresses', () => {
    expect(() => assertValidRadixAddress(INVALID_AUTO_ADDRESS, 'bet component')).toThrow(
      /Invalid Radix address for bet component/
    );
    expect(() => assertValidRadixAddress(INVALID_AUTO_ADDRESS, 'bet component')).toThrow(
      /component_tdx_2_auto_espn_baseball_401833067/
    );
  });
});

// ─── Claim Prize Manifest ───────────────────────────────────────────────────

describe('getClaimPrizeManifest', () => {
  it('generates a valid manifest for on-chain bets', () => {
    const result = getClaimPrizeManifest(makeBet(), VALID_ACCOUNT, '100', VALID_RESOURCE);

    expect(result.message).toContain('Test Bet');
    expect(result.transactionManifest).toContain('CALL_METHOD');
    expect(result.transactionManifest).toContain(VALID_ACCOUNT);
    expect(result.transactionManifest).toContain(VALID_COMPONENT);
    expect(result.transactionManifest).toContain(VALID_RESOURCE);
    expect(result.transactionManifest).toContain('"claim_prize"');
    expect(result.transactionManifest).toContain('Decimal("100")');
    expect(result.transactionManifest).toContain('"deposit_batch"');
  });

  it('throws for auto-generated component addresses', () => {
    const bet = makeBet({ component: INVALID_AUTO_ADDRESS });
    expect(() => getClaimPrizeManifest(bet, VALID_ACCOUNT, '100', VALID_RESOURCE)).toThrow(
      /Invalid Radix address for bet component/
    );
  });

  it('throws for invalid account address', () => {
    expect(() => getClaimPrizeManifest(makeBet(), 'bad_account', '100', VALID_RESOURCE)).toThrow(
      /Invalid Radix address for account/
    );
  });

  it('throws for invalid option resource address', () => {
    expect(() => getClaimPrizeManifest(makeBet(), VALID_ACCOUNT, '100', 'bad_resource')).toThrow(
      /Invalid Radix address for option resource/
    );
  });
});

// ─── Mark Winner Manifest ───────────────────────────────────────────────────

describe('getMarkWinnerManifest', () => {
  it('generates a valid manifest for on-chain bets', () => {
    const result = getMarkWinnerManifest(makeBet(), 'Option A', VALID_ACCOUNT, VALID_RESOURCE);

    expect(result.message).toContain('Test Bet');
    expect(result.transactionManifest).toContain('CALL_METHOD');
    expect(result.transactionManifest).toContain(VALID_ACCOUNT);
    expect(result.transactionManifest).toContain(VALID_COMPONENT);
    expect(result.transactionManifest).toContain('"mark_winning_option"');
    expect(result.transactionManifest).toContain('"Option A"');
    expect(result.transactionManifest).toContain('"create_proof_of_amount"');
    expect(result.transactionManifest).toContain('CLAIM_COMPONENT_ROYALTIES');
  });

  it('throws for auto-generated component addresses', () => {
    const bet = makeBet({ component: INVALID_AUTO_ADDRESS });
    expect(() => getMarkWinnerManifest(bet, 'Option A', VALID_ACCOUNT, VALID_RESOURCE)).toThrow(
      /Invalid Radix address for bet component/
    );
  });

  it('throws for invalid account address', () => {
    expect(() =>
      getMarkWinnerManifest(makeBet(), 'Option A', 'bad_account', VALID_RESOURCE)
    ).toThrow(/Invalid Radix address for account/);
  });

  it('throws for invalid owner badge address', () => {
    expect(() => getMarkWinnerManifest(makeBet(), 'Option A', VALID_ACCOUNT, 'bad_badge')).toThrow(
      /Invalid Radix address for owner badge/
    );
  });
});

// ─── Submit Vote Manifest ───────────────────────────────────────────────────

describe('getSubmitVoteManifest', () => {
  it('generates a valid manifest for on-chain bets', () => {
    const result = getSubmitVoteManifest(makeBet(), 'Option A', VALID_ACCOUNT, VALID_RESOURCE);

    expect(result.message).toContain('Test Bet');
    expect(result.transactionManifest).toContain('CALL_METHOD');
    expect(result.transactionManifest).toContain(VALID_ACCOUNT);
    expect(result.transactionManifest).toContain(VALID_COMPONENT);
    expect(result.transactionManifest).toContain('"submit_winner_vote"');
    expect(result.transactionManifest).toContain('"Option A"');
    expect(result.transactionManifest).toContain('"create_proof_of_amount"');
    expect(result.transactionManifest).toContain('Proof("verifier_proof")');
  });

  it('throws for auto-generated component addresses', () => {
    const bet = makeBet({ component: INVALID_AUTO_ADDRESS_2 });
    expect(() => getSubmitVoteManifest(bet, 'Option A', VALID_ACCOUNT, VALID_RESOURCE)).toThrow(
      /Invalid Radix address for bet component/
    );
  });

  it('throws for invalid account address', () => {
    expect(() =>
      getSubmitVoteManifest(makeBet(), 'Option A', 'bad_account', VALID_RESOURCE)
    ).toThrow(/Invalid Radix address for account/);
  });

  it('throws for invalid verifier badge address', () => {
    expect(() => getSubmitVoteManifest(makeBet(), 'Option A', VALID_ACCOUNT, 'bad_badge')).toThrow(
      /Invalid Radix address for verifier badge/
    );
  });
});

// ─── Claim Package Royalties Manifest ───────────────────────────────────────

const VALID_PACKAGE_BADGE = 'resource_tdx_2_1nfxxxxxxxxxxpkgwnrxxxxxxxxx002558553505xxxxxxxxxfzgzzk';
const VALID_NFT_ID = '[0d1c893d28aa1aa5c138d6c1aabf96d78601081917085651370c7b0884af]';

describe('getClaimPackageRoyaltiesManifest', () => {
  it('generates a valid manifest with all required instructions', () => {
    const result = getClaimPackageRoyaltiesManifest(
      VALID_PACKAGE,
      VALID_PACKAGE_BADGE,
      VALID_ACCOUNT,
      VALID_NFT_ID
    );

    expect(result.message).toBe('Claim package royalties on radix.bet');
    expect(result.transactionManifest).toContain('CLAIM_PACKAGE_ROYALTIES');
    expect(result.transactionManifest).toContain(`Address("${VALID_PACKAGE}")`);
    expect(result.transactionManifest).toContain('"create_proof_of_non_fungibles"');
    expect(result.transactionManifest).toContain(`Address("${VALID_PACKAGE_BADGE}")`);
    expect(result.transactionManifest).toContain(`NonFungibleLocalId("${VALID_NFT_ID}")`);
    expect(result.transactionManifest).toContain(`Address("${VALID_ACCOUNT}")`);
    expect(result.transactionManifest).toContain('"deposit_batch"');
    expect(result.transactionManifest).toContain('Expression("ENTIRE_WORKTOP")');
  });

  it('throws for invalid package address', () => {
    expect(() =>
      getClaimPackageRoyaltiesManifest('bad_package', VALID_PACKAGE_BADGE, VALID_ACCOUNT, VALID_NFT_ID)
    ).toThrow(/Invalid Radix address for package/);
  });

  it('throws for invalid package owner badge address', () => {
    expect(() =>
      getClaimPackageRoyaltiesManifest(VALID_PACKAGE, 'bad_badge', VALID_ACCOUNT, VALID_NFT_ID)
    ).toThrow(/Invalid Radix address for package owner badge/);
  });

  it('throws for invalid account address', () => {
    expect(() =>
      getClaimPackageRoyaltiesManifest(VALID_PACKAGE, VALID_PACKAGE_BADGE, 'bad_account', VALID_NFT_ID)
    ).toThrow(/Invalid Radix address for account/);
  });
});
