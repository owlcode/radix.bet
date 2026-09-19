export interface LeagueConfig {
  slug: string;
  name: string;
  category: string;
  hasDraw: boolean;
}

export interface OracleConfig {
  id: string;
  displayName: string;
  privateKeyEnvVar: string;
  leagues: LeagueConfig[];
  fetchIntervalMs: number;
  maxActiveBets: number;
  betAheadHours: number;
  resolveDelayHours: number;
}
