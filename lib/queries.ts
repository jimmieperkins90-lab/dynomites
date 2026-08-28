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
  home_projected_points: number | null;
  away_team_season_id: string | null;
  away_team_name: string | null;
  away_manager_name: string | null;
  away_avatar: string | null;
  away_points: number | null;
  away_projected_points: number | null;
};

export type LineupRow = {
  id: string;
  matchup_id: string;
  team_season_id: string;
  sleeper_player_id: string | null;
  player_name: string | null;
  position: string | null;
  points: number | null;
  projected_points: number | null;
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

export type StandingsRow = {
  team_season_id: string;
  team_name: string | null;
  manager_name: string;
  avatar: string | null;
  division: string | null;
  wins: number;
  losses: number;
  ties: number;
  points_for: number | null;
  points_against: number | null;
  regular_season_rank: number | null;
  final_rank: number | null;
  made_playoffs: boolean;
};

export async function getStandingsForSeason(year: number): Promise<StandingsRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", year)
    .maybeSingle();
  if (seasonError || !season) return [];

  const { data, error } = await supabase
    .from("team_seasons")
    .select(
      "id, team_name, division, wins, losses, ties, points_for, points_against, regular_season_rank, final_rank, made_playoffs, managers(display_name, real_name, avatar)"
    )
    .eq("season_id", season.id);
  if (error || !data) return [];

  const rows: StandingsRow[] = data.map((row: any) => ({
    team_season_id: row.id,
    team_name: row.team_name,
    manager_name: row.managers?.real_name ?? row.managers?.display_name ?? "Unknown",
    avatar: row.managers?.avatar ?? null,
    division: row.division,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    points_for: row.points_for,
    points_against: row.points_against,
    regular_season_rank: row.regular_season_rank,
    final_rank: row.final_rank,
    made_playoffs: row.made_playoffs,
  }));

  rows.sort((a, b) => {
    const rankA = a.final_rank ?? a.regular_season_rank ?? 999;
    const rankB = b.final_rank ?? b.regular_season_rank ?? 999;
    return rankA - rankB;
  });

  return rows;
}

export async function getChampion(year: number): Promise<StandingsRow | null> {
  const standings = await getStandingsForSeason(year);
  return standings.find((r) => r.final_rank === 1) ?? null;
}

export async function getDivisionChampions(year: number): Promise<StandingsRow[]> {
  const standings = await getStandingsForSeason(year);
  const byDivision = new Map<string, StandingsRow>();

  for (const row of standings) {
    if (!row.division) continue;
    const current = byDivision.get(row.division);
    const rank = row.regular_season_rank ?? 999;
    const currentRank = current?.regular_season_rank ?? 999;
    if (!current || rank < currentRank) {
      byDivision.set(row.division, row);
    }
  }

  return Array.from(byDivision.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

export type Article = {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  published_at: string;
  cover_image_url: string | null;
  body: string;
};

export async function getArticles(): Promise<Article[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, author, published_at, cover_image_url, body")
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return data as Article[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, author, published_at, cover_image_url, body")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as Article;
}

export type FranchiseValuation = {
  manager_id: string;
  manager_name: string;
  avatar: string | null;
  value: number;
  note: string | null;
  updated_at: string;
};

export async function getFranchiseValuations(): Promise<FranchiseValuation[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("franchise_valuations")
    .select("manager_id, value, note, updated_at, managers(display_name, real_name, avatar)")
    .order("value", { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    manager_id: row.manager_id,
    manager_name: row.managers?.real_name ?? row.managers?.display_name ?? "Unknown",
    avatar: row.managers?.avatar ?? null,
    value: row.value,
    note: row.note,
    updated_at: row.updated_at,
  }));
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

export function buildHeadToHead(rows: TeamGameScore[]) {
  const table: Record<string, Record<string, { wins: number; losses: number; ties: number }>> = {};

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
