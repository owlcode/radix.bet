/**
 * Seed the playground with demo markets.
 *
 * The fixture in `seed-data/markets.json` is a snapshot of real markets from
 * the Stokenet deployment — real component and resource addresses, real
 * option names, real vote totals. It carries no personal data: the accounts
 * that created these markets are replaced with a single demo identity, and
 * individual votes are not included, only the per-option totals that were
 * already public on-ledger.
 *
 * Deadlines are rewritten relative to the moment you run this, so the seed
 * does not decay into a wall of expired markets. Roughly a third land in the
 * future and stay ACTIVE, which is what makes the voting flow demonstrable
 * locally; the rest keep their RESOLVED state and a past deadline.
 *
 * Run with `pnpm db:seed`. It is idempotent — re-running replaces the same
 * rows rather than accumulating duplicates.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });

interface SeedOption {
  id: number;
  name: string;
  imageUrl: string;
  resourceAddress: string;
  totalVotes: string;
}

interface SeedMarket {
  componentAddress: string;
  name: string;
  slug: string | null;
  description: string | null;
  currency: string | null;
  deadline: string;
  verifierType: string;
  status: string;
  winningOptionId: number | null;
  createdAt: string;
  voteCount: number;
  options: SeedOption[];
}

interface SeedFile {
  demoIdentityAddress: string;
  markets: SeedMarket[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every third market becomes an open one, the rest stay settled. */
function reschedule(market: SeedMarket, index: number, now: number) {
  const keepOpen = index % 3 === 0;

  if (keepOpen) {
    return {
      deadline: new Date(now + (index + 2) * DAY_MS).toISOString(),
      status: 'ACTIVE' as const,
      winningOptionId: null,
      createdAt: new Date(now - (index + 1) * DAY_MS)
    };
  }

  return {
    deadline: new Date(now - (index + 1) * DAY_MS).toISOString(),
    status: market.status === 'ACTIVE' ? 'RESOLVED' : market.status,
    winningOptionId: market.winningOptionId ?? market.options[0]?.id ?? null,
    createdAt: new Date(now - (index + 10) * DAY_MS)
  };
}

async function main() {
  const connectionString = process.env.RADIXBET_DATABASE_URL;
  if (!connectionString) {
    throw new Error('RADIXBET_DATABASE_URL is not set. Copy .env.example to .env first.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const file: SeedFile = JSON.parse(
    readFileSync(resolve(here, 'seed-data/markets.json'), 'utf8')
  );
  const now = Date.now();

  try {
    // The demo creator every seeded market hangs off. Bet.userIdentityAddress
    // is a foreign key, so this has to exist first.
    await prisma.user.upsert({
      where: { identityAddress: file.demoIdentityAddress },
      create: { identityAddress: file.demoIdentityAddress },
      update: {}
    });

    let optionCount = 0;

    for (const [index, market] of file.markets.entries()) {
      const timing = reschedule(market, index, now);

      const data = {
        name: market.name,
        slug: market.slug,
        description: market.description,
        currency: market.currency,
        deadline: timing.deadline,
        verifierType: market.verifierType,
        status: timing.status as never,
        winningOptionId: timing.winningOptionId,
        createdAt: timing.createdAt,
        userIdentityAddress: file.demoIdentityAddress
      };

      await prisma.bet.upsert({
        where: { componentAddress: market.componentAddress },
        create: { componentAddress: market.componentAddress, ...data },
        update: data
      });

      for (const option of market.options) {
        const optionData = {
          name: option.name,
          imageUrl: option.imageUrl,
          componentAddress: market.componentAddress,
          totalVotes: option.totalVotes
        };

        await prisma.betOption.upsert({
          where: { resourceAddress: option.resourceAddress },
          create: { resourceAddress: option.resourceAddress, ...optionData },
          update: optionData
        });
        optionCount += 1;
      }
    }

    const open = file.markets.filter((_, i) => i % 3 === 0).length;
    console.log(
      `Seeded ${file.markets.length} markets (${open} open, ${file.markets.length - open} settled) ` +
        `and ${optionCount} options.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
