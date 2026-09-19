import { prisma } from '@radix-bet/database';
import { addJob } from '@radix-bet/queue';
import { QUEUE_NAMES, type OracleResolveBetJobData } from '@radix-bet/types';
import {
  buildMarkWinnerManifest,
  submitTransaction,
  deriveAccount,
  fundFromFaucet,
  getXrdBalance,
} from '@radix-bet/radix';
import { isStokenet } from '@radix-bet/config';
import { fetchGameResult } from './espn.js';
import { ALL_ORACLES } from './configs.js';

const MIN_XRD_BALANCE = 100;

const RESCHEDULE_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const STALE_GAME_HOURS = 72; // Give up after 3 days past start time

export async function processResolveBet(
  oracleId: string,
  oracleGameId: string,
  espnEventId: string,
): Promise<void> {
  const config = ALL_ORACLES.find((o) => o.id === oracleId);
  if (!config) throw new Error(`Unknown oracle: ${oracleId}`);

  const game = await prisma.oracleGame.findUnique({
    where: { id: oracleGameId },
  });
  if (!game) {
    console.warn(`[resolve-bet] OracleGame not found: ${oracleGameId}, discarding orphaned job`);
    return;
  }
  if (game.status !== 'BET_CREATED') {
    console.log(`[${config.displayName}] Game ${game.id} not in BET_CREATED state (${game.status}), skipping`);
    return;
  }

  const leagueSlug = `${game.sport}/${game.league}`;
  const league = config.leagues.find((l) => l.slug === leagueSlug);
  if (!league) throw new Error(`League not found: ${leagueSlug}`);

  // Abort if the game is too old — ESPN data may no longer be available
  const hoursSinceStart = (Date.now() - game.startTime.getTime()) / (1000 * 60 * 60);
  if (hoursSinceStart > STALE_GAME_HOURS) {
    console.error(
      `[${config.displayName}] RESOLUTION_FAILED — game is stale (${Math.round(hoursSinceStart)}h old)\n` +
        `  game: ${game.homeTeamName} vs ${game.awayTeamName} (id=${game.id})\n` +
        `  startTime: ${game.startTime.toISOString()}`,
    );
    await prisma.oracleGame.update({
      where: { id: game.id },
      data: { status: 'RESOLUTION_FAILED' },
    });
    return;
  }

  // Fetch current game result from ESPN
  const result = await fetchGameResult(league, espnEventId, game.startTime);

  if (!result || !result.isCompleted) {
    console.log(`[${config.displayName}] Game ${game.homeTeamName} vs ${game.awayTeamName} not finished yet, rescheduling...`);

    await addJob<OracleResolveBetJobData>(
      QUEUE_NAMES.ORACLE_RESOLVE_BET,
      { oracleId, oracleGameId, espnEventId },
      { delay: RESCHEDULE_DELAY_MS },
    );
    return;
  }

  // Determine winner
  let winnerTeam: string;
  let winningOptionName: string;

  if (result.homeWinner) {
    winnerTeam = 'home';
    winningOptionName = game.homeTeamName;
  } else if (result.awayWinner) {
    winnerTeam = 'away';
    winningOptionName = game.awayTeamName;
  } else if (league.hasDraw) {
    winnerTeam = 'draw';
    winningOptionName = 'Draw';
  } else {
    console.error(
      `[${config.displayName}] RESOLUTION_FAILED — cannot determine winner\n` +
        `  game: ${game.homeTeamName} vs ${game.awayTeamName} (id=${game.id})\n` +
        `  espnEventId: ${espnEventId}\n` +
        `  league: ${leagueSlug} (hasDraw=${league.hasDraw})\n` +
        `  espnResult: homeWinner=${result.homeWinner}, awayWinner=${result.awayWinner}\n` +
        `  reason: no winner flag set and league does not allow draws`,
    );
    await prisma.oracleGame.update({
      where: { id: game.id },
      data: { status: 'RESOLUTION_FAILED' },
    });
    return;
  }

  const privateKey = process.env[config.privateKeyEnvVar];
  if (!privateKey) throw new Error(`${config.privateKeyEnvVar} not set`);

  if (!game.betComponentAddress || !game.ownerBadgeAddress) {
    console.error(
      `[${config.displayName}] RESOLUTION_FAILED — missing on-chain addresses\n` +
        `  game: ${game.homeTeamName} vs ${game.awayTeamName} (id=${game.id})\n` +
        `  espnEventId: ${espnEventId}\n` +
        `  betComponentAddress: ${game.betComponentAddress ?? 'MISSING'}\n` +
        `  ownerBadgeAddress: ${game.ownerBadgeAddress ?? 'MISSING'}\n` +
        `  winner: ${winningOptionName} (${winnerTeam})\n` +
        `  reason: cannot submit mark-winner TX without both addresses`,
    );
    await prisma.oracleGame.update({
      where: { id: game.id },
      data: { status: 'RESOLUTION_FAILED' },
    });
    return;
  }

  try {
    console.log(`[${config.displayName}] Resolving: ${game.homeTeamName} vs ${game.awayTeamName} → ${winningOptionName}`);

    const { account } = await deriveAccount(privateKey);

    // Auto-fund from faucet on Stokenet if balance is low
    if (isStokenet()) {
      const balance = await getXrdBalance(account.address);
      if (balance < MIN_XRD_BALANCE) {
        console.log(`[${config.displayName}] Low XRD balance (${balance}), funding from faucet...`);
        await fundFromFaucet(account.address);
        console.log(`[${config.displayName}] Faucet funding complete`);
      }
    }

    const manifest = buildMarkWinnerManifest({
      componentAddress: game.betComponentAddress,
      winningOption: winningOptionName,
      ownerBadgeAddress: game.ownerBadgeAddress,
      accountAddress: account.address,
    });

    const txHash = await submitTransaction(privateKey, manifest);

    await prisma.oracleGame.update({
      where: { id: game.id },
      data: {
        status: 'RESOLVED',
        winnerTeam,
        resolveTransactionId: txHash,
      },
    });

    console.log(`[${config.displayName}] Resolved: ${game.homeTeamName} vs ${game.awayTeamName} → ${winningOptionName} (TX: ${txHash})`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isPermanent = msg.includes('CommittedFailure') || msg.includes('Rejected');

    if (isPermanent) {
      console.error(
        `[${config.displayName}] RESOLUTION_FAILED — on-chain transaction rejected\n` +
          `  game: ${game.homeTeamName} vs ${game.awayTeamName} (id=${game.id})\n` +
          `  espnEventId: ${espnEventId}\n` +
          `  winner: ${winningOptionName} (${winnerTeam})\n` +
          `  betComponentAddress: ${game.betComponentAddress}\n` +
          `  ownerBadgeAddress: ${game.ownerBadgeAddress}\n` +
          `  error: ${msg}`,
      );
      await prisma.oracleGame.update({
        where: { id: game.id },
        data: { status: 'RESOLUTION_FAILED' },
      });
    } else {
      console.error(
        `[${config.displayName}] resolve-bet transient error (will retry)\n` +
          `  game: ${game.homeTeamName} vs ${game.awayTeamName} (id=${game.id})\n` +
          `  error: ${msg}`,
      );
    }
    throw error;
  }
}
