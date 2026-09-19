import type { OracleConfig } from './types.js';

export const NBA_ORACLE: OracleConfig = {
  id: 'nba',
  displayName: 'NBA Oracle',
  privateKeyEnvVar: 'NBA_ORACLE_PRIVATE_KEY',
  leagues: [
    { slug: 'basketball/nba', name: 'NBA', category: 'NBA', hasDraw: false },
  ],
  fetchIntervalMs: 30 * 60 * 1000, // 30 minutes
  maxActiveBets: 15,
  betAheadHours: 48,
  resolveDelayHours: 2,
};

export const FOOTBALL_ORACLE: OracleConfig = {
  id: 'football',
  displayName: 'Football Oracle',
  privateKeyEnvVar: 'FOOTBALL_ORACLE_PRIVATE_KEY',
  leagues: [
    { slug: 'soccer/eng.1', name: 'Premier League', category: 'Premier League', hasDraw: true },
    { slug: 'soccer/esp.1', name: 'La Liga', category: 'La Liga', hasDraw: true },
    { slug: 'soccer/ita.1', name: 'Serie A', category: 'Serie A', hasDraw: true },
    { slug: 'soccer/ger.1', name: 'Bundesliga', category: 'Bundesliga', hasDraw: true },
    { slug: 'soccer/fra.1', name: 'Ligue 1', category: 'Ligue 1', hasDraw: true },
    { slug: 'soccer/uefa.champions', name: 'Champions League', category: 'Champions League', hasDraw: true },
    { slug: 'soccer/usa.1', name: 'MLS', category: 'MLS', hasDraw: true },
  ],
  fetchIntervalMs: 30 * 60 * 1000, // 30 minutes
  maxActiveBets: 20,
  betAheadHours: 168, // 7 days — football games cluster on weekends, longer window ensures steady flow
  resolveDelayHours: 2,
};

export const ALL_ORACLES: OracleConfig[] = [NBA_ORACLE, FOOTBALL_ORACLE];
