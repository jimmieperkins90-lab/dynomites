import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BASE = "https://api.sleeper.app/v1";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sleeper API ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type SleeperLeague = {
  league_id: string;
  previous_league_id: string | null;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  settings: { playoff_week_start?: number };
  roster_positions: string[];
};

export type SleeperUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string };
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against: number;
    fpts_against_decimal?: number;
    rank?: number;
  };
};

export type SleeperMatchup = {
  matchup_id: number | null;
  roster_id: number;
  points: number;
  starters: string[];
  players: string[];
  players_points: Record<string, number>;
};

export type BracketMatch = {
  r: number; // round
  m: number; // match id within round
  t1: number | null; // roster_id, or null if TBD
  t2: number | null;
  w: number | null; // winner roster_id, once decided
  l: number | null;
  p?: number; // "place" game marker, e.g. 1 = championship, 3 = 3rd place game
};

export function getLeague(leagueId: string) {
  return get<SleeperLeague>(`${BASE}/league/${leagueId}`);
}

export function getUsers(leagueId: string) {
  return get<SleeperUser[]>(`${BASE}/league/${leagueId}/users`);
}

export function getRosters(leagueId: string) {
  return get<SleeperRoster[]>(`${BASE}/league/${leagueId}/rosters`);
}

export function getMatchups(leagueId: string, week: number) {
  return get<SleeperMatchup[]>(`${BASE}/league/${leagueId}/matchups/${week}`);
}

export function getWinnersBracket(leagueId: string) {
  return get<BracketMatch[]>(`${BASE}/league/${leagueId}/winners_bracket`);
}

export function getLosersBracket(leagueId: string) {
  return get<BracketMatch[]>(`${BASE}/league/${leagueId}/losers_bracket`);
}

export function getNflState() {
  return get<{ week: number; season: string; season_type: string }>(
    `${BASE}/state/nfl`
  );
}

// The full player list is ~5MB and Sleeper asks that you not hammer this
// endpoint -- cache it to disk for 24h and only pull the fields we need for
// players actually seen in a lineup.
const CACHE_DIR = path.join(os.tmpdir(), "dynomites-cache");
const CACHE_FILE = path.join(CACHE_DIR, "players.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getPlayerMap(): Promise<
  Record<string, { full_name: string; position: string | null; team: string | null }>
> {
  if (fs.existsSync(CACHE_FILE)) {
    const stat = fs.statSync(CACHE_FILE);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  }

  const raw = await get<Record<string, any>>(`${BASE}/players/nfl`);
  const trimmed: Record<
    string,
    { full_name: string; position: string | null; team: string | null }
  > = {};
  for (const [id, p] of Object.entries(raw)) {
    trimmed[id] = {
      full_name: p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      position: p.position ?? null,
      team: p.team ?? null,
    };
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(trimmed));
  return trimmed;
}
