import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '@radix-bet/database';
import { addJob } from '@radix-bet/queue';
import { QUEUE_NAMES, type OracleFetchJobData } from '@radix-bet/types';
import { ALL_ORACLES } from '../oracle/configs.js';
import { getGatewayClient } from '@radix-bet/radix';
import { createComponentTriggers } from '../hookah/triggers.js';
import { generateBetSlug } from '../utils/slug.js';
import { logger } from '../utils/logger.js';

const router: RouterType = Router();

// GET /api/admin/oracle/games?oracleId=nba&status=BET_CREATED&league=eng.1&page=1&pageSize=20
router.get('/games', async (req, res) => {
  try {
    const { oracleId, status, league, page = '1', pageSize = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    if (oracleId) where.oracleId = oracleId;
    if (status) where.status = status;
    if (league) where.league = league;

    const [games, total] = await Promise.all([
      prisma.oracleGame.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.oracleGame.count({ where }),
    ]);

    res.json({ games, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/admin/oracle/stats?oracleId=nba
router.get('/stats', async (req, res) => {
  try {
    const { oracleId } = req.query;
    const where: any = oracleId ? { oracleId } : {};

    const [total, discovered, betCreated, resolved, failed] = await Promise.all([
      prisma.oracleGame.count({ where }),
      prisma.oracleGame.count({ where: { ...where, status: 'DISCOVERED' } }),
      prisma.oracleGame.count({ where: { ...where, status: 'BET_CREATED' } }),
      prisma.oracleGame.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.oracleGame.count({
        where: { ...where, status: { in: ['BET_FAILED', 'RESOLUTION_FAILED'] } },
      }),
    ]);

    res.json({ total, discovered, active: betCreated, resolved, failed });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/admin/oracle/fetch-now?oracleId=nba
router.post('/fetch-now', async (req, res) => {
  try {
    const { oracleId } = req.query;
    if (!oracleId || typeof oracleId !== 'string') {
      return res.status(400).json({ error: 'oracleId query parameter required' });
    }

    const config = ALL_ORACLES.find((o) => o.id === oracleId);
    if (!config) {
      return res.status(404).json({ error: `Oracle not found: ${oracleId}` });
    }

    await addJob<OracleFetchJobData>(QUEUE_NAMES.ORACLE_FETCH, { oracleId });
    res.json({ message: `Fetch job enqueued for ${config.displayName}` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/admin/oracle/configs
router.get('/configs', (_req, res) => {
  const configs = ALL_ORACLES.map((o) => ({
    id: o.id,
    displayName: o.displayName,
    leagues: o.leagues,
    fetchIntervalMs: o.fetchIntervalMs,
    maxActiveBets: o.maxActiveBets,
    betAheadHours: o.betAheadHours,
    resolveDelayHours: o.resolveDelayHours,
    hasPrivateKey: !!process.env[o.privateKeyEnvVar],
  }));
  res.json(configs);
});

// POST /api/admin/oracle/reconcile-bets
// Finds OracleGames with BET_CREATED status + componentAddress but no matching Bet row,
// then creates Bet records from on-chain + extension data and sets up Hookah triggers.
router.post('/reconcile-bets', async (_req, res) => {
  try {
    // Find OracleGames that created bets on-chain but have no DB Bet row
    const gamesWithNoBet = await prisma.$queryRaw<Array<{
      id: string;
      homeTeamName: string;
      awayTeamName: string;
      homeTeamLogo: string | null;
      awayTeamLogo: string | null;
      startTime: Date;
      sport: string;
      league: string;
      betComponentAddress: string;
      transactionId: string;
      oracleId: string;
    }>>`
      SELECT og.id, og."homeTeamName", og."awayTeamName", og."homeTeamLogo", og."awayTeamLogo",
             og."startTime", og.sport, og.league, og."betComponentAddress", og."transactionId", og."oracleId"
      FROM "OracleGame" og
      LEFT JOIN "Bet" b ON b."componentAddress" = og."betComponentAddress"
      WHERE og.status = 'BET_CREATED'
        AND og."betComponentAddress" IS NOT NULL
        AND b."componentAddress" IS NULL
    `;

    if (gamesWithNoBet.length === 0) {
      return res.json({ message: 'All bets are in sync', reconciled: 0 });
    }

    logger.info(`Reconciling ${gamesWithNoBet.length} missing bets`);

    const SYSTEM_IDENTITY = 'identity_system_unlinked_bets';
    await prisma.user.upsert({
      where: { identityAddress: SYSTEM_IDENTITY },
      update: {},
      create: { identityAddress: SYSTEM_IDENTITY }
    });

    const gw = getGatewayClient();
    const results: Array<{ game: string; componentAddress: string; status: string; error?: string }> = [];

    for (const game of gamesWithNoBet) {
      try {
        // Get option resource addresses from on-chain component state
        // Must pass explicitMetadata opt-in to get resource names
        const details = await gw.state.getEntityDetailsVaultAggregated(
          game.betComponentAddress,
          { explicitMetadata: ['name'] }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fungibleResources = (details as any).fungible_resources?.items ?? [];

        // Also try reading the state fields for deadline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stateFields: Array<{ field_name?: string; value?: any }> = (details as any).details?.state?.fields ?? [];
        const deadlineField = stateFields.find((f) => f.field_name === 'deadline');

        // Build option list from OracleGame data + on-chain resource addresses
        const oracleConfig = ALL_ORACLES.find((o) => o.id === game.oracleId);
        const leagueConfig = oracleConfig?.leagues.find((l) => l.slug.split('/')[1] === game.league);
        const hasDraw = leagueConfig?.hasDraw ?? false;

        const PLACEHOLDER_IMAGE = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/default-team-logo-500.png&w=100&h=100';
        const expectedOptions = [
          { name: game.homeTeamName, image: game.homeTeamLogo || PLACEHOLDER_IMAGE },
          { name: game.awayTeamName, image: game.awayTeamLogo || PLACEHOLDER_IMAGE },
        ];
        if (hasDraw) {
          expectedOptions.push({ name: 'Draw', image: PLACEHOLDER_IMAGE });
        }

        // Match on-chain resources to options by metadata name
        const optionsWithAddresses = [];
        for (const opt of expectedOptions) {
          // Find the fungible resource whose name matches this option
          const matchedResource = fungibleResources.find((r: any) => {
            const nameMeta = r.explicit_metadata?.items?.find((m: any) => m.key === 'name');
            return nameMeta?.value?.typed?.value === opt.name;
          });

          optionsWithAddresses.push({
            name: opt.name,
            imageUrl: opt.image,
            resourceAddress: matchedResource?.resource_address ?? `unknown_${opt.name}`,
            totalVotes: '0'
          });
        }

        // Get BetExtension metadata
        const extension = game.transactionId
          ? await prisma.betExtension.findUnique({ where: { transactionId: game.transactionId } })
          : null;

        const betName = `${game.homeTeamName} vs ${game.awayTeamName}`;
        const slug = extension?.slug || generateBetSlug(betName);
        const deadlineUnix = deadlineField?.value
          ? Number(deadlineField.value)
          : Math.floor(game.startTime.getTime() / 1000) - 5 * 60;
        const deadline = new Date(deadlineUnix * 1000).toISOString();

        // Create Bet + BetOptions
        await prisma.bet.create({
          data: {
            componentAddress: game.betComponentAddress,
            name: betName,
            slug,
            deadline,
            currency: null, // Oracle bets always use XRD
            description: extension?.description || null,
            categoryId: extension?.categoryId || null,
            userIdentityAddress: SYSTEM_IDENTITY,
            status: 'ACTIVE',
            options: {
              create: optionsWithAddresses
            }
          }
        });

        // Clean up BetExtension
        if (extension) {
          await prisma.betExtension.delete({ where: { transactionId: game.transactionId! } }).catch(() => {});
        }

        // Create Hookah component triggers
        try {
          await createComponentTriggers(game.betComponentAddress);
        } catch (err) {
          logger.warn(`Failed to create triggers for ${game.betComponentAddress}`, {
            error: err instanceof Error ? err.message : String(err)
          });
        }

        results.push({
          game: betName,
          componentAddress: game.betComponentAddress,
          status: 'created',
        });

        logger.info(`Reconciled bet: ${betName} → ${game.betComponentAddress}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          game: `${game.homeTeamName} vs ${game.awayTeamName}`,
          componentAddress: game.betComponentAddress,
          status: 'failed',
          error: msg,
        });
        logger.error(`Failed to reconcile bet for ${game.betComponentAddress}: ${msg}`);
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    res.json({ reconciled: created, failed, results });
  } catch (error) {
    logger.error('Reconcile bets failed', { error: String(error) });
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/admin/oracle/fix-resource-addresses
// Fixes BetOptions with 'unknown_' resource addresses by querying on-chain component state
router.post('/fix-resource-addresses', async (_req, res) => {
  try {
    // Find BetOptions with unknown resource addresses
    const brokenOptions = await prisma.betOption.findMany({
      where: { resourceAddress: { startsWith: 'unknown_' } },
      include: { bet: true }
    });

    if (brokenOptions.length === 0) {
      return res.json({ message: 'All resource addresses are valid', fixed: 0 });
    }

    // Group by component address
    const byComponent = new Map<string, typeof brokenOptions>();
    for (const opt of brokenOptions) {
      const existing = byComponent.get(opt.componentAddress) || [];
      existing.push(opt);
      byComponent.set(opt.componentAddress, existing);
    }

    logger.info(`Fixing resource addresses for ${byComponent.size} components`);

    const gw = getGatewayClient();
    let fixed = 0;
    const errors: string[] = [];

    for (const [componentAddress, options] of byComponent) {
      try {
        // Query Gateway for component's fungible resources with metadata
        const details = await gw.state.getEntityDetailsVaultAggregated(
          componentAddress,
          { explicitMetadata: ['name'] }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fungibleResources: any[] = (details as any).fungible_resources?.items ?? [];

        for (const opt of options) {
          // Strip the 'unknown_' prefix to get the option name
          const optionName = opt.resourceAddress.replace('unknown_', '');

          // Find matching resource by iterating through fungible resources
          // and checking their metadata for a matching name
          let matchedAddress: string | null = null;

          for (const resource of fungibleResources) {
            const items = resource.explicit_metadata?.items ?? [];
            const nameMeta = items.find((m: any) => m.key === 'name');
            const nameValue = nameMeta?.value?.typed?.value
              ?? nameMeta?.value?.programmatic_json?.value;

            if (nameValue === optionName) {
              matchedAddress = resource.resource_address;
              break;
            }
          }

          if (matchedAddress) {
            await prisma.betOption.update({
              where: { id: opt.id },
              data: { resourceAddress: matchedAddress }
            });
            fixed++;
            logger.info(`Fixed resource address: ${optionName} → ${matchedAddress.slice(0, 30)}...`);
          } else {
            errors.push(`${componentAddress}: no match for "${optionName}"`);
          }
        }
      } catch (err) {
        errors.push(`${componentAddress}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    res.json({ fixed, total: brokenOptions.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    logger.error('Fix resource addresses failed', { error: String(error) });
    res.status(500).json({ error: String(error) });
  }
});

export { router as oracleRouter };
