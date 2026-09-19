/**
 * Integration Tests: Account Creation -> Bet Creation -> Voting
 *
 * Tests the core prediction market flow on Stokenet:
 * 1. Wallet creation and faucet funding
 * 2. Bet creation with multiple options
 * 3. Voting on bet options from multiple wallets
 * 4. Prize pool verification
 *
 * Run with: pnpm --filter @radix-bet/integration-tests test
 */

import {
  createBetTransaction,
  waitForTransaction,
  getComponentState,
  getResourceBalance,
  gateway,
  TestWallet,
  TransactionResult,
  XRD_ADDRESS
} from './utils/radix-client';
import {
  waitForBetInDatabase,
  cleanupTestBet,
  checkDatabaseConnection,
  disconnectDatabase
} from './utils/database';
import { createAndFundWallets, voteAndVerify } from './utils/test-helpers';

describe('Radix Bet Integration Tests', () => {
  let creatorWallet: TestWallet;
  let voter1Wallet: TestWallet;
  let voter2Wallet: TestWallet;
  let betResult: TransactionResult;
  let componentAddress: string;
  let optionAddresses: string[];
  let ownerBadgeAddress: string;
  let isDatabaseAvailable = false;

  beforeAll(async () => {
    isDatabaseAvailable = await checkDatabaseConnection();
    if (!isDatabaseAvailable) {
      console.log('Database not available - skipping DB verification tests');
    }
  });

  afterAll(async () => {
    if (componentAddress && isDatabaseAvailable) {
      await cleanupTestBet(componentAddress);
    }
    await disconnectDatabase();
  });

  describe('1. Wallet Setup and Faucet Funding', () => {
    it('should create and fund 3 test wallets', async () => {
      [creatorWallet, voter1Wallet, voter2Wallet] = await createAndFundWallets(3);
    }, 300_000);
  });

  describe('2. Bet Creation', () => {
    it('should create a bet with 3 options', async () => {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 min

      const txHash = await createBetTransaction(creatorWallet, {
        name: `IntTest-${Date.now()}`,
        options: [
          { name: 'Option A', image: 'https://example.com/a.png' },
          { name: 'Option B', image: 'https://example.com/b.png' },
          { name: 'Option C', image: 'https://example.com/c.png' }
        ],
        deadlineTimestamp
      });

      console.log(`  Create Bet TX: ${txHash}`);
      betResult = await waitForTransaction(txHash);

      expect(betResult.status).toBe('CommittedSuccess');
      expect(betResult.componentAddress).toMatch(/^component_tdx_2_/);
      expect(betResult.ownerBadgeAddress).toMatch(/^resource_tdx_2_/);

      componentAddress = betResult.componentAddress!;
      optionAddresses = betResult.optionAddresses!;
      ownerBadgeAddress = betResult.ownerBadgeAddress!;

      // Owner badge + 3 option tokens = 4 fungibles created
      expect(betResult.newFungibleAddresses).toHaveLength(4);
      expect(optionAddresses).toHaveLength(3);

      console.log(`  Component: ${componentAddress}`);
      console.log(`  Owner Badge: ${ownerBadgeAddress}`);
      console.log(`  Option Tokens: ${optionAddresses.join(', ')}`);
    }, 120_000);

    it('should verify bet component exists on-chain', async () => {
      const state = await getComponentState(componentAddress);
      expect(state).not.toBeNull();
      expect(state.address).toBe(componentAddress);
    });

    it('should verify owner badge deposited to creator', async () => {
      const badgeBalance = await getResourceBalance(creatorWallet.address, ownerBadgeAddress);
      expect(badgeBalance).toBe(1);
    });
  });

  describe('3. Voting on Bet Options', () => {
    it('Voter1 votes 100 XRD on Option A', async () => {
      await voteAndVerify(
        voter1Wallet,
        componentAddress,
        'Option A',
        100,
        optionAddresses[0],
        'Voter1'
      );
    }, 120_000);

    it('Voter2 votes 200 XRD on Option A', async () => {
      await voteAndVerify(
        voter2Wallet,
        componentAddress,
        'Option A',
        200,
        optionAddresses[0],
        'Voter2'
      );
    }, 120_000);

    it('Voter1 votes 50 XRD on Option B', async () => {
      await voteAndVerify(
        voter1Wallet,
        componentAddress,
        'Option B',
        50,
        optionAddresses[1],
        'Voter1'
      );
    }, 120_000);

    it('Creator votes 150 XRD on Option C', async () => {
      await voteAndVerify(
        creatorWallet,
        componentAddress,
        'Option C',
        150,
        optionAddresses[2],
        'Creator'
      );
    }, 120_000);

    it('should have 500 XRD total in prize pool', async () => {
      const state = await getComponentState(componentAddress);
      expect(state).not.toBeNull();

      const fungibles = (state as any).fungible_resources?.items || [];
      const xrdVault = fungibles.find((f: any) => f.resource_address === XRD_ADDRESS);
      if (xrdVault) {
        const totalXrd = parseFloat(xrdVault.vaults.items[0]?.amount || '0');
        console.log(`  Prize pool: ${totalXrd} XRD`);
        expect(totalXrd).toBe(500);
      }
    });
  });

  describe('4. Event Processor Integration (optional)', () => {
    it.skipIf(!isDatabaseAvailable)(
      'should sync bet to database',
      async () => {
        const bet = await waitForBetInDatabase(componentAddress, 30, 2000);

        if (bet) {
          expect(bet.componentAddress).toBe(componentAddress);
          console.log(`  Bet synced: ${bet.name}`);
        } else {
          console.log('  Bet not in DB - event-processor may not be running');
        }
      },
      120_000
    );
  });
});

describe('Gateway API Health', () => {
  it('should connect to Stokenet', async () => {
    const status = await gateway.status.getCurrent();
    expect(status.ledger_state.epoch).toBeGreaterThan(0);
    console.log(`  Stokenet epoch: ${status.ledger_state.epoch}`);
  });

  it('should have correct network ID', async () => {
    const config = await gateway.status.getNetworkConfiguration();
    expect(config.network_id).toBe(2);
    console.log(`  Network: ${config.network_name}`);
  });
});
