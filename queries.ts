import { getSupabase } from "@/lib/supabase";

export type GameResult = {
  home_matchup_id: string;
  away_matchup_id: string | null;
  season_id: string;
  season_year: number;
  week: number;
  phase: string | null;
  round_game: string | null;
  is_playoff: boolean;
  game_played: boolean;
  home_team_season_id: string;
  home_team_name: string | null;
  home_manager_name: string;
  home_avatar: string | null;
  home_points: number | null;
  away_team_season_id: string | null;
  away_team_name: string | null;
  away_manager_name: string | null;
  away_avatar: string | null;
  away_points: number | null;
};

export type LineupRow = {
  id: string;
  matchup_id: string;
  team_season_id: string;
  sleeper_player_id: string | null;
  player_name: string | null;
  position: string | null;
  points: number | null;
  started: boolean;
};

export type CareerStat = {
  manager_id: string;
  manager_name: string;
  avatar: string | null;
  seasons_played: number;
  total_wins: number;
  total_losses: number;
  total_ties: number;
  total_points_for: number | null;
  total_points_against: number | null;
  championships: number;
  playoff_appearances: number;
};

export type TeamGameScore = {
  matchup_id: string;
  season_id: string;
  season_year: number;
  week: number;
  phase: string | null;
  round_game: string | null;
  is_playoff: boolean;
  game_played: boolean;
  team_season_id: string;
  team_name: string | null;
  manager_name: string;
  avatar: string | null;
  points: number | null;
  opponent_team_season_id: string | null;
  opponent_team_name: string | null;
  opponent_manager_name: string | null;
  opponent_points: number | null;
};

// Position sort order for box-score display. Exact roster slot (which WR/FLEX)
// isn't reliably derivable from Sleeper's API, so this groups by actual NFL
// position only.
const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  DEF: 5,
  K: 6,
};

function positionRank(pos: string | null) {
  if (!pos) return 99;
  return POSITION_ORDER[pos.toUpperCase()] ?? 50;
}

export async function getSeasonYears(): Promise<number[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("seasons")
    .select("year")
    .order("year", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => row.year as number);
}

export async function getGamesForSeason(year: number): Promise<GameResult[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("game_results")
    .select("*")
    .eq("season_year", year)
    .order("week", { ascending: true })
    .order("home_team_name", { ascending: true });
  if (error || !data) return [];
  return data as GameResult[];
}

export async function getGameById(id: string): Promise<GameResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("game_results")
    .select("*")
    .eq("home_matchup_id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as GameResult;
}

export function sortStarters(a: LineupRow, b: LineupRow) {
  const posDiff = positionRank(a.position) - positionRank(b.position);
  if (posDiff !== 0) return posDiff;
  return (b.points ?? 0) - (a.points ?? 0);
}

export async function getLineupsForMatchup(
  matchupId: string
): Promise<{ starters: LineupRow[]; bench: LineupRow[] }> {
  const supabase = getSupabase();
  if (!supabase) return { starters: [], bench: [] };
  const { data, error } = await supabase
    .from("lineups")
    .select("*")
    .eq("matchup_id", matchupId);
  if (error || !data) return { starters: [], bench: [] };

  const rows = data as LineupRow[];
  const starters = rows.filter((r) => r.started).sort(sortStarters);
  const bench = rows
    .filter((r) => !r.started)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  return { starters, bench };
}

// Fetches ONLY starters for a batch of matchup ids in one (or a few) round
// trips, grouped by matchup_id. Used by the games list page so every row can
// unfold in place without a request per game. Batches the `.in()` filter to
// keep request URLs a reasonable size.
export async function getStartersForMatchupIds(
  matchupIds: string[]
): Promise<Record<string, LineupRow[]>> {
  const supabase = getSupabase();
  const grouped: Record<string, LineupRow[]> = {};
  if (!supabase || matchupIds.length === 0) return grouped;

  const BATCH_SIZE = 50;
  for (let i = 0; i < matchupIds.length; i += BATCH_SIZE) {
    const batch = matchupIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("lineups")
      .select("*")
      .in("matchup_id", batch)
      .eq("started", true);
    if (error || !data) continue;
    for (const row of data as LineupRow[]) {
      (grouped[row.matchup_id] ??= []).push(row);
    }
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort(sortStarters);
  }
  return grouped;
}

export async function getCareerStats(): Promise<CareerStat[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("career_stats")
    .select("*")
    .order("total_wins", { ascending: false });
  if (error || !data) return [];
  return data as CareerStat[];
}

export async function getAllTeamGameScores(): Promise<TeamGameScore[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("team_game_scores")
    .select("*")
    .eq("game_played", true);
  if (error || !data) return [];
  return data as TeamGameScore[];
}

export async function getAllPlayedGames(): Promise<GameResult[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("game_results")
    .select("*")
    .eq("game_played", true)
    .not("away_team_season_id", "is", null);
  if (error || !data) return [];
  return data as GameResult[];
}

// Head-to-head record for every manager pair, built from the flattened
// per-team score rows. Returns manager -> opponent -> {wins, losses, ties}.
export function buildHeadToHead(rows: TeamGameScore[]) {
  const table: Record<
    string,
    Record<string, { wins: number; losses: number; ties: number }>
  > = {};

  for (const row of rows) {
    if (!row.opponent_manager_name || row.points == null || row.opponent_points == null) {
      continue;
    }
    const a = row.manager_name;
    const b = row.opponent_manager_name;
    table[a] = table[a] ?? {};
    table[a][b] = table[a][b] ?? { wins: 0, losses: 0, ties: 0 };

    if (row.points > row.opponent_points) table[a][b].wins += 1;
    else if (row.points < row.opponent_points) table[a][b].losses += 1;
    else table[a][b].ties += 1;
  }

  return table;
}
