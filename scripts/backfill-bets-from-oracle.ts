/**
 * Backfill Bet records from OracleGame entries that have betComponentAddress set
 * but no corresponding Bet record. Useful when Hookah is down and BetCreatedEvents
 * didn't arrive.
 */
import { prisma } from '@radix-bet/database';
import crypto from 'crypto';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

async function main() {
  const SYSTEM_IDENTITY = 'identity_system_unlinked_bets';
  await prisma.user.upsert({
    where: { identityAddress: SYSTEM_IDENTITY },
    update: {},
    create: { identityAddress: SYSTEM_IDENTITY },
  });

  const games = await prisma.oracleGame.findMany({
    where: {
      status: 'BET_CREATED',
      betComponentAddress: { not: null },
    },
  });

  let created = 0;
  for (const game of games) {
    if (!game.betComponentAddress) continue;

    const existing = await prisma.bet.findUnique({
      where: { componentAddress: game.betComponentAddress },
    });
    if (existing) {
      console.log(`  Skip: ${game.homeTeamName} vs ${game.awayTeamName} (already exists)`);
      continue;
    }

    const betName = `${game.homeTeamName} vs ${game.awayTeamName}`;
    const deadlineUnix = Math.floor(game.startTime.getTime() / 1000) - 5 * 60;
    const deadline = new Date(deadlineUnix * 1000).toISOString();

    await prisma.bet.create({
      data: {
        componentAddress: game.betComponentAddress,
        name: betName,
        slug: generateSlug(betName),
        deadline,
        category: game.sport === 'basketball' ? 'NBA' : game.league,
        userIdentityAddress: SYSTEM_IDENTITY,
        status: 'ACTIVE',
      },
    });
    created++;
    console.log(`  Created: ${betName} → ${game.betComponentAddress.slice(0, 40)}...`);
  }

  console.log(`\nBackfilled ${created} bets`);
  await prisma.$disconnect();
}

main();
