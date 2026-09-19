import { prisma } from '@radix-bet/database';

async function main() {
  const games = await prisma.oracleGame.findMany({
    orderBy: { startTime: 'asc' },
    take: 15,
  });
  console.log(`OracleGames: ${games.length}`);
  for (const g of games) {
    console.log(`  ${g.homeTeamName} vs ${g.awayTeamName} | ${g.status} | component=${g.betComponentAddress?.slice(0, 30) || 'NULL'}...`);
  }

  const bets = await prisma.bet.findMany({ take: 5 });
  console.log(`\nBets in DB: ${bets.length}`);
  for (const b of bets) {
    console.log(`  ${b.name} | ${b.status} | slug=${b.slug} | deadline=${b.deadline}`);
  }

  await prisma.$disconnect();
}

main();
