import { prisma } from '@radix-bet/database';
import { addJob } from '@radix-bet/queue';
import { QUEUE_NAMES, type OracleResolveBetJobData } from '@radix-bet/types';
import {
  buildCreateBetManifest,
  submitTransaction,
  deriveAccount,
  fundFromFaucet,
  getXrdBalance,
  getGatewayClient,
} from '@radix-bet/radix';
import { isStokenet } from '@radix-bet/config';
import { config } from '../config/index.js';
import { ALL_ORACLES } from './configs.js';
import type { OracleConfig, LeagueConfig } from './types.js';
import { generateBetSlug } from '../utils/slug.js';

const MIN_XRD_BALANCE = 100;

function getLeagueConfig(oracleConfig: OracleConfig, leagueId: string): LeagueConfig | undefined {
  return oracleConfig.leagues.find((l) => {
    const slug = l.slug.split('/')[1];
    return slug === leagueId;
  });
}

function estimateGameDurationMs(sport: string): number {
  if (sport === 'basketball') return 2.5 * 60 * 60 * 1000;
  return 2 * 60 * 60 * 1000;
}

export async function processCreateBet(oracleId: string, oracleGameId: string): Promise<void> {
  const oracleConfig = ALL_ORACLES.find((o) => o.id === oracleId);
  if (!oracleConfig) throw new Error(`Unknown oracle: ${oracleId}`);

  const game = await prisma.oracleGame.findUnique({ where: { id: oracleGameId } });
  if (!game) throw new Error(`OracleGame not found: ${oracleGameId}`);
  if (game.status !== 'DISCOVERED') {
    console.log(`[${oracleConfig.displayName}] Game ${game.id} already processed (status: ${game.status}), skipping`);
    return;
  }

  const privateKey = process.env[oracleConfig.privateKeyEnvVar];
  if (!privateKey) throw new Error(`${oracleConfig.privateKeyEnvVar} not set`);

  const packageAddress = config.RADIX_PACKAGE_ADDRESS;
  if (!packageAddress) throw new Error('RADIX_PACKAGE_ADDRESS not set');

  const league = getLeagueConfig(oracleConfig, game.league);
  const hasDraw = league?.hasDraw ?? false;

  // Scrypto contract validates URLs — use a placeholder for missing logos
  const PLACEHOLDER_IMAGE = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/default-team-logo-500.png&w=100&h=100';
  const optionNames = [game.homeTeamName, game.awayTeamName];
  const optionImages = [game.homeTeamLogo || PLACEHOLDER_IMAGE, game.awayTeamLogo || PLACEHOLDER_IMAGE];
  if (hasDraw) {
    optionNames.push('Draw');
    optionImages.push(PLACEHOLDER_IMAGE);
  }

  const betName = `${game.homeTeamName} vs ${game.awayTeamName}`;
  // Close betting 5 minutes before game starts
  const deadlineUnix = Math.floor(game.startTime.getTime() / 1000) - 5 * 60;

  try {
    console.log(`[${oracleConfig.displayName}] Creating bet: ${betName}`);

    const { account } = await deriveAccount(privateKey);

    // Auto-fund from faucet on Stokenet if balance is low
    if (isStokenet()) {
      const balance = await getXrdBalance(account.address);
      if (balance < MIN_XRD_BALANCE) {
        console.log(`[${oracleConfig.displayName}] Low XRD balance (${balance}), funding from faucet...`);
        await fundFromFaucet(account.address);
        console.log(`[${oracleConfig.displayName}] Faucet funding complete`);
      }
    }

    const manifest = buildCreateBetManifest({
      accountAddress: account.address,
      packageAddress,
      betName,
      optionNames,
      optionImages,
      deadlineUnixSeconds: deadlineUnix,
    });

    const txHash = await submitTransaction(privateKey, manifest);

    // submitTransaction already polls until CommittedSuccess — just fetch committed details
    const gw = getGatewayClient();
    const txDetails = await gw.transaction.getCommittedDetails(txHash);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txReceipt = txDetails.transaction.receipt as Record<string, any>;
    const newEntities: Array<any> = txReceipt?.state_updates?.new_global_entities || [];

    // Extract component address from created entities
    const componentAddress = newEntities.find(
      (e: any) => e.entity_type === 'GlobalGenericComponent',
    )?.entity_address;

    // Read owner_badge from on-chain component state instead of guessing from
    // new entities — the tx creates multiple fungible resources (badge + option
    // tokens) and find() was picking the wrong one.
    let ownerBadgeAddress: string | null = null;
    if (componentAddress) {
      try {
        const gw = getGatewayClient();
        const details = await gw.state.getEntityDetailsVaultAggregated(componentAddress);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fields: Array<{ field_name?: string; value?: any }> = (details as any).details?.state?.fields ?? [];
        ownerBadgeAddress = String(fields.find((f) => f.field_name === 'owner_badge')?.value ?? '') || null;
      } catch (err) {
        console.warn(`[${oracleConfig.displayName}] Could not read owner_badge from component state:`, err);
        // Fallback to heuristic — first non-fungible resource (for multi-verifier) or first fungible
        ownerBadgeAddress = newEntities.find(
          (e: any) => e.entity_type === 'GlobalNonFungibleResourceManager' || e.entity_type === 'GlobalFungibleResourceManager',
        )?.entity_address ?? null;
      }
    }

    await prisma.oracleGame.update({
      where: { id: game.id },
      data: {
        status: 'BET_CREATED',
        betComponentAddress: componentAddress || null,
        ownerBadgeAddress: ownerBadgeAddress || null,
        transactionId: txHash,
      },
    });

    // Create BetExtension with metadata for the event processor to merge
    // when BetCreatedEvent arrives from Hookah. No direct Bet writes.
    try {
      const slug = generateBetSlug(betName);
      // Look up the sports category for oracle-created bets
      const sportsCategory = await prisma.category.findUnique({
        where: { slug: 'sports' }
      });

      await prisma.betExtension.upsert({
        where: { transactionId: txHash },
        update: {},
        create: {
          transactionId: txHash,
          description: `${game.homeTeamName} vs ${game.awayTeamName}`,
          categoryId: sportsCategory?.id ?? null,
          slug,
        },
      });
      console.log(`[${oracleConfig.displayName}] BetExtension created for tx ${txHash.slice(0, 16)}...`);
    } catch (err) {
      console.warn(`[${oracleConfig.displayName}] Failed to write BetExtension (non-fatal):`, err);
    }

    // Schedule resolution: startTime + game duration + resolveDelay
    const resolveDelay =
      game.startTime.getTime() - Date.now() +
      estimateGameDurationMs(game.sport) +
      oracleConfig.resolveDelayHours * 60 * 60 * 1000;

    await addJob<OracleResolveBetJobData>(
      QUEUE_NAMES.ORACLE_RESOLVE_BET,
      { oracleId: oracleConfig.id, oracleGameId: game.id, espnEventId: game.espnEventId },
      { delay: Math.max(resolveDelay, 0) },
    );

    console.log(`[${oracleConfig.displayName}] Bet created: ${betName} → ${componentAddress}, resolve in ${Math.round(resolveDelay / 60000)}min`);
  } catch (error) {
    console.error(`[${oracleConfig.displayName}] Failed to create bet for ${betName}:`, error);
    await prisma.oracleGame.update({
      where: { id: game.id },
      data: { status: 'BET_FAILED' },
    });
    throw error;
  }
}
