export type PlayerProjections = Record<string, number>; // sleeper_player_id -> projected half-PPR points

const PROJECTION_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * Bulk player projections for a season/week from Sleeper's projections endpoint.
 * NOTE: this is an unofficial, community-reverse-engineered endpoint (not in
 * Sleeper's published API docs) -- it could change or disappear without notice.
 * Returns half-PPR point projections keyed by sleeper_player_id.
 */
export async function getWeekProjections(season: string, week: number): Promise<PlayerProjections> {
  const results = await Promise.all(
    PROJECTION_POSITIONS.map(async (pos) => {
      const url = `https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular&position[]=${pos}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return (await res.json()) as Array<{ player_id: string; stats?: Record<string, number> }>;
    })
  );

  const map: PlayerProjections = {};
  for (const list of results) {
    for (const proj of list) {
      const pts = proj.stats?.pts_half_ppr;
      if (pts != null) map[proj.player_id] = pts;
    }
  }
  return map;
}
export type PlayerProjections = Record<string, number>; // sleeper_player_id -> projected half-PPR points

const PROJECTION_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * Bulk player projections for a season/week from Sleeper's projections endpoint.
 * NOTE: this is an unofficial, community-reverse-engineered endpoint (not in
 * Sleeper's published API docs) -- it could change or disappear without notice.
 * Returns half-PPR point projections keyed by sleeper_player_id.
 */
export async function getWeekProjections(season: string, week: number): Promise<PlayerProjections> {
  const results = await Promise.all(
    PROJECTION_POSITIONS.map(async (pos) => {
      const url = `https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular&position[]=${pos}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return (await res.json()) as Array<{ player_id: string; stats?: Record<string, number> }>;
    })
  );

  const map: PlayerProjections = {};
  for (const list of results) {
    for (const proj of list) {
      const pts = proj.stats?.pts_half_ppr;
      if (pts != null) map[proj.player_id] = pts;
    }
  }
  return map;
}
