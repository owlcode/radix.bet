import type { LeagueConfig } from './types.js';

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports';

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    displayName: string;
    logo?: string;
  };
  score?: string;
  winner?: boolean;
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status: {
    type: {
      completed: boolean;
    };
  };
}

export interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  competitions: ESPNCompetition[];
}

export interface ParsedGame {
  espnEventId: string;
  name: string;
  startTime: Date;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  isCompleted: boolean;
  homeScore: string | null;
  awayScore: string | null;
  homeWinner: boolean | null;
  awayWinner: boolean | null;
  league: LeagueConfig;
}

function formatEspnDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function fetchEspnEvents(league: LeagueConfig, date: Date): Promise<ESPNEvent[]> {
  const dateStr = formatEspnDate(date);
  const url = `${ESPN_API}/${league.slug}/scoreboard?dates=${dateStr}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

function parseEvent(event: ESPNEvent, league: LeagueConfig): ParsedGame | null {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const home = comp.competitors.find((c) => c.homeAway === 'home');
  const away = comp.competitors.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  return {
    espnEventId: event.id,
    name: event.name,
    startTime: new Date(event.date),
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    homeTeamLogo: home.team.logo || null,
    awayTeamLogo: away.team.logo || null,
    isCompleted: comp.status?.type?.completed ?? false,
    homeScore: home.score ?? null,
    awayScore: away.score ?? null,
    homeWinner: home.winner ?? null,
    awayWinner: away.winner ?? null,
    league,
  };
}

/**
 * Fetch upcoming games for a set of leagues within the lookahead window.
 * Returns only future, non-completed games sorted by start time.
 */
export async function fetchUpcomingGames(
  leagues: LeagueConfig[],
  aheadHours: number,
): Promise<ParsedGame[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + aheadHours * 60 * 60 * 1000);

  // Build date range: today + enough days to cover aheadHours
  const dates: Date[] = [];
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  while (d <= cutoff) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Fetch all league+date combos in parallel
  const fetches = leagues.flatMap((league) =>
    dates.map(async (date) => {
      const events = await fetchEspnEvents(league, date);
      return events.map((e) => parseEvent(e, league)).filter(Boolean) as ParsedGame[];
    }),
  );

  const results = await Promise.all(fetches);
  const allGames = results.flat();

  // Filter to future, non-completed games within the window
  return allGames
    .filter((g) => g.startTime > now && g.startTime <= cutoff && !g.isCompleted)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Fetch the result of a specific game by ESPN event ID.
 * ESPN scoreboard dates use US Eastern time, so a UTC midnight game may be
 * listed under the previous calendar day.  We try the stored date and the
 * day before to handle the UTC→ET offset.
 */
export async function fetchGameResult(
  league: LeagueConfig,
  espnEventId: string,
  gameDate: Date,
): Promise<ParsedGame | null> {
  const events = await fetchEspnEvents(league, gameDate);
  let event = events.find((e) => e.id === espnEventId);

  if (!event) {
    const dayBefore = new Date(gameDate.getTime() - 24 * 60 * 60 * 1000);
    const prevEvents = await fetchEspnEvents(league, dayBefore);
    event = prevEvents.find((e) => e.id === espnEventId);
  }

  if (!event) return null;
  return parseEvent(event, league);
}
