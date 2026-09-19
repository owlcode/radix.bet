import { prisma } from '@radix-bet/database';
import { addJob } from '@radix-bet/queue';
import { QUEUE_NAMES, type OracleCreateBetJobData } from '@radix-bet/types';
import { fetchUpcomingGames } from './espn.js';
import { ALL_ORACLES } from './configs.js';
import type { OracleConfig } from './types.js';

async function fetchGamesForOracle(config: OracleConfig): Promise<void> {
  console.log(`[${config.displayName}] Fetching upcoming games (${config.betAheadHours}h ahead)...`);

  // Check active bet count
  const activeBets = await prisma.oracleGame.count({
    where: {
      oracleId: config.id,
      status: { in: ['DISCOVERED', 'BET_CREATED'] },
    },
  });

  if (activeBets >= config.maxActiveBets) {
    console.log(`[${config.displayName}] Max active bets reached (${activeBets}/${config.maxActiveBets}), skipping fetch`);
    return;
  }

  const slotsAvailable = config.maxActiveBets - activeBets;
  const games = await fetchUpcomingGames(config.leagues, config.betAheadHours);
  console.log(`[${config.displayName}] Found ${games.length} upcoming games, ${slotsAvailable} slots available`);

  // Batch dedup: load all existing espnEventIds in one query instead of per-game
  const existingGames = await prisma.oracleGame.findMany({
    where: {
      oracleId: config.id,
      espnEventId: { in: games.map((g) => g.espnEventId) },
    },
    select: { espnEventId: true },
  });
  const existingIds = new Set(existingGames.map((g) => g.espnEventId));

  let created = 0;
  for (const game of games) {
    if (created >= slotsAvailable) break;

    if (existingIds.has(game.espnEventId)) continue;

    // Insert as DISCOVERED
    const oracleGame = await prisma.oracleGame.create({
      data: {
        espnEventId: game.espnEventId,
        sport: game.league.slug.split('/')[0],
        league: game.league.slug.split('/')[1],
        homeTeamName: game.homeTeam,
        awayTeamName: game.awayTeam,
        homeTeamLogo: game.homeTeamLogo,
        awayTeamLogo: game.awayTeamLogo,
        startTime: game.startTime,
        oracleId: config.id,
      },
    });

    // Enqueue bet creation
    await addJob<OracleCreateBetJobData>(QUEUE_NAMES.ORACLE_CREATE_BET, {
      oracleId: config.id,
      oracleGameId: oracleGame.id,
    });

    created++;
    console.log(`[${config.displayName}] Discovered: ${game.homeTeam} vs ${game.awayTeam} (${game.league.name}, ${game.startTime.toISOString()})`);
  }

  console.log(`[${config.displayName}] Created ${created} new game records`);
}

export async function processFetchGames(oracleId: string): Promise<void> {
  const config = ALL_ORACLES.find((o) => o.id === oracleId);
  if (!config) throw new Error(`Unknown oracle: ${oracleId}`);
  await fetchGamesForOracle(config);
}
