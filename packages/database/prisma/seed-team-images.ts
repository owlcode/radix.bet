/**
 * Seed the TeamImage table by fetching team logos from ESPN scoreboards.
 *
 * Run: pnpm --filter @radix-bet/database exec tsx prisma/seed-team-images.ts
 *
 * Requires RADIXBET_DATABASE_URL to be set.
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/index.js';

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports';

const LEAGUES = [
  { slug: 'basketball/nba', sport: 'basketball', league: 'nba' },
  { slug: 'soccer/eng.1', sport: 'soccer', league: 'eng.1' },
  { slug: 'soccer/esp.1', sport: 'soccer', league: 'esp.1' },
  { slug: 'soccer/ita.1', sport: 'soccer', league: 'ita.1' },
  { slug: 'soccer/ger.1', sport: 'soccer', league: 'ger.1' },
  { slug: 'soccer/fra.1', sport: 'soccer', league: 'fra.1' },
  { slug: 'soccer/uefa.champions', sport: 'soccer', league: 'uefa.champions' },
  { slug: 'soccer/usa.1', sport: 'soccer', league: 'usa.1' },
];

interface TeamInfo {
  teamName: string;
  sport: string;
  league: string;
  imageUrl: string;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function fetchTeamsFromScoreboard(
  slug: string,
  sport: string,
  league: string,
  dateStr: string,
): Promise<TeamInfo[]> {
  const url = `${ESPN_API}/${slug}/scoreboard?dates=${dateStr}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const events = data.events || [];
    const teams: TeamInfo[] = [];

    for (const event of events) {
      const competitors = event.competitions?.[0]?.competitors || [];
      for (const comp of competitors) {
        const name = comp.team?.displayName;
        const logo = comp.team?.logo;
        if (name && logo) {
          teams.push({ teamName: name, sport, league, imageUrl: logo });
        }
      }
    }
    return teams;
  } catch {
    return [];
  }
}

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env['RADIXBET_DATABASE_URL'],
  });

  console.log('Fetching team data from ESPN scoreboards...');

  // Fetch from multiple dates to maximize team coverage
  const dates: string[] = [];
  for (let offset = -7; offset <= 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    dates.push(formatDate(d));
  }

  const allTeams = new Map<string, TeamInfo>();

  for (const leagueConfig of LEAGUES) {
    console.log(`  Fetching ${leagueConfig.slug}...`);
    for (const dateStr of dates) {
      const teams = await fetchTeamsFromScoreboard(
        leagueConfig.slug,
        leagueConfig.sport,
        leagueConfig.league,
        dateStr,
      );
      for (const team of teams) {
        // Use teamName as key for dedup
        if (!allTeams.has(team.teamName)) {
          allTeams.set(team.teamName, team);
        }
      }
    }
    console.log(`    Found ${[...allTeams.values()].filter((t) => t.league === leagueConfig.league).length} teams`);
  }

  console.log(`\nTotal unique teams: ${allTeams.size}`);
  console.log('Upserting to database...');

  let created = 0;
  let updated = 0;

  for (const team of allTeams.values()) {
    const result = await prisma.teamImage.upsert({
      where: { teamName: team.teamName },
      create: team,
      update: { imageUrl: team.imageUrl, sport: team.sport, league: team.league },
    });
    if (result.updatedAt.getTime() - Date.now() < 1000) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Done! Created/updated ${allTeams.size} team images.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
