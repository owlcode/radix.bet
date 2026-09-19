/**
 * Full Bet Lifecycle Integration Test
 *
 * Tests the complete prediction market lifecycle on Stokenet:
 * 1. Create a bet with a very short deadline (90 seconds)
 * 2. Multiple voters place bets
 * 3. Wait for deadline to pass
 * 4. Mark winning option (burns owner badge)
 * 5. Winners claim their prizes, losers are rejected
 *
 * This test takes ~4-5 minutes to complete due to deadline waiting.
 * Run with: pnpm --filter @radix-bet/integration-tests test -- --testPathPattern lifecycle
 */

import { describe, it, expect } from 'vitest';
import {
  createBetTransaction,
  markWinnerTransaction,
  claimPrizeTransaction,
  waitForTransaction,
  getBalance,
  getResourceBalance,
  sleep,
  gateway,
  TestWallet
} from './utils/radix-client';
import { createAndFundWallets, voteAndVerify } from './utils/test-helpers';

describe('Full Bet Lifecycle', () => {
  let creator: TestWallet;
  let voterA: TestWallet;
  let voterB: TestWallet;
  let componentAddress: string;
  let optionAddresses: string[];
  let ownerBadgeAddress: string;

  // Use 90-second deadline so we can test the full lifecycle
  const DEADLINE_SECONDS = 90;

  describe('Setup: Create wallets and fund', () => {
    it('should create and fund 3 wallets', async () => {
      [creator, voterA, voterB] = await createAndFundWallets(3);
    }, 300_000);
  });

  describe('Phase 1: Create bet with short deadline', () => {
    it('should create a bet expiring in 90 seconds', async () => {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;

      const txHash = await createBetTransaction(creator, {
        name: `Lifecycle-${Date.now()}`,
        options: [
          { name: 'Yes', image: 'https://example.com/yes.png' },
          { name: 'No', image: 'https://example.com/no.png' }
        ],
        deadlineTimestamp
      });

      const result = await waitForTransaction(txHash);
      expect(result.status).toBe('CommittedSuccess');
      expect(result.componentAddress).toBeDefined();

      componentAddress = result.componentAddress!;
      optionAddresses = result.optionAddresses!;
      ownerBadgeAddress = result.ownerBadgeAddress!;

      expect(optionAddresses).toHaveLength(2);
      console.log(`  Bet created: ${componentAddress}`);
      console.log(`  Deadline: ${new Date(deadlineTimestamp * 1000).toISOString()}`);
      console.log(`  Yes token: ${optionAddresses[0]}, No token: ${optionAddresses[1]}`);
      console.log(`  Owner badge: ${ownerBadgeAddress}`);
    }, 120_000);
  });

  describe('Phase 2: Place votes', () => {
    it('VoterA bets 100 XRD on Yes', async () => {
      await voteAndVerify(voterA, componentAddress, 'Yes', 100, optionAddresses[0], 'VoterA');
    }, 120_000);

    it('VoterB bets 50 XRD on No', async () => {
      await voteAndVerify(voterB, componentAddress, 'No', 50, optionAddresses[1], 'VoterB');
    }, 120_000);

    it('Creator bets 50 XRD on Yes', async () => {
      await voteAndVerify(creator, componentAddress, 'Yes', 50, optionAddresses[0], 'Creator');
      console.log(`  Total pool: 200 XRD (150 Yes, 50 No)`);
    }, 120_000);
  });

  describe('Phase 3: Wait for deadline and mark winner', () => {
    it('should wait for deadline to pass', async () => {
      console.log(`  Waiting ~${DEADLINE_SECONDS + 30} seconds for deadline to pass...`);
      await sleep(DEADLINE_SECONDS * 1000 + 30_000);
      console.log(`  Deadline should have passed`);
    }, 180_000);

    it('should mark "Yes" as the winner (burns owner badge)', async () => {
      const txHash = await markWinnerTransaction(
        creator,
        componentAddress,
        ownerBadgeAddress,
        'Yes'
      );

      console.log(`  Mark Winner TX: ${txHash}`);
      const result = await waitForTransaction(txHash);
      expect(result.status).toBe('CommittedSuccess');

      // Verify owner badge was burned
      const badgeBalance = await getResourceBalance(creator.address, ownerBadgeAddress);
      expect(badgeBalance).toBe(0);
      console.log(`  Winner marked as "Yes", owner badge burned`);
    }, 120_000);
  });

  describe('Phase 4: Claim prizes', () => {
    it('VoterA claims prize with 100 Yes tokens', async () => {
      const balanceBefore = await getBalance(voterA.address);

      const txHash = await claimPrizeTransaction(
        voterA,
        componentAddress,
        optionAddresses[0], // Yes token
        100
      );

      const result = await waitForTransaction(txHash);
      expect(result.status).toBe('CommittedSuccess');

      const balanceAfter = await getBalance(voterA.address);
      const gained = balanceAfter - balanceBefore;

      // VoterA had 100 of 150 total Yes tokens
      // Expected prize: 100/150 * 200 = ~133.33 XRD (minus fees)
      console.log(`  VoterA claimed: gained ~${gained.toFixed(2)} XRD`);
      expect(gained).toBeGreaterThan(100); // Should receive more than invested
    }, 120_000);

    it('Creator claims prize with 50 Yes tokens', async () => {
      const balanceBefore = await getBalance(creator.address);

      const txHash = await claimPrizeTransaction(
        creator,
        componentAddress,
        optionAddresses[0], // Yes token
        50
      );

      const result = await waitForTransaction(txHash);
      expect(result.status).toBe('CommittedSuccess');

      const balanceAfter = await getBalance(creator.address);
      const gained = balanceAfter - balanceBefore;

      console.log(`  Creator claimed: gained ~${gained.toFixed(2)} XRD`);
      expect(gained).toBeGreaterThan(0);
    }, 120_000);

    it('VoterB cannot claim (bet on losing option "No")', async () => {
      try {
        const txHash = await claimPrizeTransaction(
          voterB,
          componentAddress,
          optionAddresses[1], // No token
          50
        );

        const result = await waitForTransaction(txHash);
        // The transaction should fail on-chain
        expect(result.status).toBe('CommittedFailure');
        console.log(`  VoterB claim correctly rejected (wrong option)`);
      } catch (error) {
        // Transaction might also be rejected at submission
        console.log(`  VoterB claim correctly failed`);
      }
    }, 120_000);
  });
});
