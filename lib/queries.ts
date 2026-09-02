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

// getGameById() (and therefore the /games/[id] route) only looks games up by
// home_matchup_id. Several other tables/views (lineups, team_game_scores)
// expose matchup ids from the PER-TEAM perspective, which equals
// away_matchup_id for the away side of a game -- following that id straight
// into a /games/[id] link 404s roughly half the time. This map translates
// ANY per-team matchup id (home or away) to its canonical home_matchup_id so
// every link in the app can resolve correctly regardless of which side of
// the game a row came from.
export async function getCanonicalMatchupIdMap(): Promise<Map<string, string>> {
  const supabase = getSupabase();
  const map = new Map<string, string>();
  if (!supabase) return map;
  const { data, error } = await supabase
    .from("game_results")
    .select("home_matchup_id, away_matchup_id");
  if (error || !data) return map;
  for (const row of data as { home_matchup_id: string; away_matchup_id: string | null }[]) {
    map.set(row.home_matchup_id, row.home_matchup_id);
    if (row.away_matchup_id) map.set(row.away_matchup_id, row.home_matchup_id);
  }
  return map;
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

// Ranks two teams by regular-season performance: wins first, points_for as
// the tiebreaker. `regular_season_rank` is NOT used here -- it is never
// populated by the sync (always null in the DB) so relying on it caused
// division champions to be picked essentially at random.
function isBetterRegularSeason(a: StandingsRow, b: StandingsRow): boolean {
  if (a.wins !== b.wins) return a.wins > b.wins;
  return (a.points_for ?? 0) > (b.points_for ?? 0);
}

export async function getDivisionChampions(year: number): Promise<StandingsRow[]> {
  const standings = await getStandingsForSeason(year);
  const byDivision = new Map<string, StandingsRow>();

  for (const row of standings) {
    if (!row.division) continue;
    const current = byDivision.get(row.division);
    if (!current || isBetterRegularSeason(row, current)) {
      byDivision.set(row.division, row);
    }
  }

  return Array.from(byDivision.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

// Tallies division titles per manager across every season. Skips any
// division "champion" from a season with 0 games played (same premature-
// data guard used on the homepage banners), so an unstarted season can
// never award a phantom division title.
export async function getDivisionTitleCountsByManager(): Promise<Record<string, number>> {
  const years = await getSeasonYears();
  const counts: Record<string, number> = {};
  for (const year of years) {
    const champs = await getDivisionChampions(year);
    for (const team of champs) {
      if (team.wins + team.losses + team.ties === 0) continue;
      counts[team.manager_name] = (counts[team.manager_name] ?? 0) + 1;
    }
  }
  return counts;
}

export type PlayoffRound = {
  round: string;
  games: GameResult[];
};

export type PlayoffBracket = {
  winners: PlayoffRound[]; // the actual championship bracket
  losers: PlayoffRound[]; // the consolation bracket
  unplaced: GameResult[]; // is_playoff=true but phase wasn't set (sync data-quality gap)
};

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// The consolation (losers) bracket's own round labels are relative to ITS
// bracket only -- its "Championship" decides 1st place *within the losers
// bracket*, which is really (winnersBracketSize + 1)th place league-wide,
// not 1st. Once we know how many teams were in the winners bracket (the
// offset), translate the losers bracket's placement-deciding rounds
// (Championship, 3rd Place, 5th Place, ...) into real standings (7th, 9th,
// 11th, ...). Round 1/Semifinal are left alone since they're just bracket
// progress, not a placement decision themselves.
function relabelForAbsolutePlacement(round: string, offset: number): string {
  if (offset <= 0) return round;
  if (round === "Championship") {
    const place = offset + 1;
    return `${place}${ordinalSuffix(place)} Place`;
  }
  const match = round.match(/^(\d+)(?:st|nd|rd|th) Place$/);
  if (match) {
    const place = offset + Number(match[1]);
    return `${place}${ordinalSuffix(place)} Place`;
  }
  return round;
}

// Builds the playoff bracket for a season from game_results, grouping by
// phase (winners_bracket = championship bracket, losers_bracket =
// consolation bracket). Columns are ordered by the week they were actually
// played (earliest first), with placement games (round_game containing
// "Place") sorted after the main advancing game of that same week -- e.g.
// the real Semifinals before a same-week 5th Place game. This intentionally
// does NOT rely on a hardcoded round-name list, since a bracket can produce
// round labels beyond the basic Round 1/Semifinal/Championship/3rd Place set
// (5th Place, 7th Place, etc. on larger brackets) and week-order sorting
// handles any of them correctly without special-casing each one.
// home_matchup_id doubles as the canonical id here already, so no separate
// id-translation step is needed for the /games/[id] links.
//
// Only games that have actually been played are included -- Sleeper
// generates the full bracket's pairings (0-0, unplayed) as soon as seeding
// is set, often well before the games are actually played, so without this
// filter an in-progress or not-yet-started playoff bracket would show empty
// placeholder games.
export async function getPlayoffBracket(year: number): Promise<PlayoffBracket> {
  const games = await getGamesForSeason(year);
  const playoffGames = games.filter((g) => g.is_playoff && g.away_team_season_id && g.game_played);

  const winnersTeamCount = new Set(
    playoffGames
      .filter((g) => g.phase === "winners_bracket")
      .flatMap((g) => [g.home_team_season_id, g.away_team_season_id])
  ).size;

  function bucket(phase: "winners_bracket" | "losers_bracket"): PlayoffRound[] {
    const byRound = new Map<string, GameResult[]>();
    for (const g of playoffGames) {
      if (g.phase !== phase) continue;
      const round = g.round_game ?? "Playoff";
      (byRound.get(round) ?? byRound.set(round, []).get(round)!).push(g);
    }
    const groups = Array.from(byRound.entries()).map(([round, roundGames]) => ({
      round,
      games: roundGames,
      minWeek: Math.min(...roundGames.map((g) => g.week)),
    }));
    groups.sort((a, b) => {
      if (a.minWeek !== b.minWeek) return a.minWeek - b.minWeek;
      const aPlacement = /place/i.test(a.round);
      const bPlacement = /place/i.test(b.round);
      if (aPlacement !== bPlacement) return aPlacement ? 1 : -1;
      return a.round.localeCompare(b.round);
    });
    const offset = phase === "losers_bracket" ? winnersTeamCount : 0;
    return groups.map(({ round, games: roundGames }) => ({
      round: relabelForAbsolutePlacement(round, offset),
      games: roundGames,
    }));
  }

  const unplaced = playoffGames.filter((g) => g.phase !== "winners_bracket" && g.phase !== "losers_bracket");

  return {
    winners: bucket("winners_bracket"),
    losers: bucket("losers_bracket"),
    unplaced,
  };
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
  team_name: string | null;
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
    .select("manager_id, value, note, updated_at")
    .order("value", { ascending: false });
  if (error || !data) return [];
  if (data.length === 0) return [];

  // Fetched as a separate lookup rather than an embedded
  // `managers(...)` select -- PostgREST's automatic relationship
  // embedding depends on its schema cache being current, which can lag
  // behind recent migrations (this project has had many this session).
  // A plain filtered select on manager IDs has no such dependency.
  const managerIds = data.map((row: any) => row.manager_id);
  const { data: managerRows } = await supabase
    .from("managers")
    .select("id, display_name, real_name, avatar")
    .in("id", managerIds);
  const managerById = new Map<string, any>();
  for (const m of managerRows ?? []) {
    managerById.set(m.id, m);
  }

  // franchise_valuations doesn't store a team name itself, and a team's
  // name/logo can change year to year (e.g. "Louisville Morning Chubb"
  // becoming "JB's Morning Chubb") -- so "current" team name is defined as
  // whatever the manager's team was called in the most recent season.
  const years = await getSeasonYears();
  const latestYear = years[0];
  const teamNameByManager = new Map<string, string>();
  if (latestYear != null) {
    const { data: seasonRow } = await supabase
      .from("seasons")
      .select("id")
      .eq("year", latestYear)
      .maybeSingle();
    if (seasonRow) {
      const { data: teamRows } = await supabase
        .from("team_seasons")
        .select("manager_id, team_name")
        .eq("season_id", seasonRow.id);
      for (const row of (teamRows ?? []) as { manager_id: string; team_name: string | null }[]) {
        if (row.team_name) teamNameByManager.set(row.manager_id, row.team_name);
      }
    }
  }

  return data.map((row: any) => {
    const mgr = managerById.get(row.manager_id);
    return {
      manager_id: row.manager_id,
      manager_name: mgr?.real_name ?? mgr?.display_name ?? "Unknown",
      team_name: teamNameByManager.get(row.manager_id) ?? null,
      avatar: mgr?.avatar ?? null,
      value: Number(row.value),
      note: row.note,
      updated_at: row.updated_at,
    };
  });
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
    .order("total_wins", { ascending: false, nullsFirst: false });
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

export type HeadToHeadGame = {
  matchup_id: string; // per-team id -- do NOT link with this directly, see game_id
  game_id: string; // canonical home_matchup_id, safe to use in /games/[id] links
  season_year: number;
  week: number;
  points: number;
  opponent_points: number;
  result: "W" | "L" | "T";
  game_type: "Playoff" | "Consolation" | "Regular";
};

export type HeadToHeadData = {
  summary: Record<string, Record<string, { wins: number; losses: number; ties: number }>>;
  games: Record<string, Record<string, HeadToHeadGame[]>>;
};

function headToHeadGameType(row: TeamGameScore): "Playoff" | "Consolation" | "Regular" {
  if (row.phase === "winners_bracket") return "Playoff";
  if (row.phase === "losers_bracket") return "Consolation";
  // A handful of rows have is_playoff=true but no phase set (a sync data-
  // quality gap, same family as the premature-2026-row issue) -- treat
  // those as Playoff rather than silently mislabeling them Regular.
  if (row.is_playoff) return "Playoff";
  return "Regular";
}

// Builds both the win/loss/tie summary AND the full per-game history for
// every manager pairing. Requires the canonical matchup-id map (see
// getCanonicalMatchupIdMap) since team_game_scores.matchup_id is a per-team
// id that can't be linked to /games/[id] directly.
export function buildHeadToHead(
  rows: TeamGameScore[],
  canonicalIds: Map<string, string>
): HeadToHeadData {
  const summary: HeadToHeadData["summary"] = {};
  const games: HeadToHeadData["games"] = {};

  for (const row of rows) {
    if (!row.opponent_manager_name || row.points == null || row.opponent_points == null) {
      continue;
    }
    const a = row.manager_name;
    const b = row.opponent_manager_name;
    summary[a] = summary[a] ?? {};
    summary[a][b] = summary[a][b] ?? { wins: 0, losses: 0, ties: 0 };
    games[a] = games[a] ?? {};
    games[a][b] = games[a][b] ?? [];

    let result: "W" | "L" | "T";
    if (row.points > row.opponent_points) {
      summary[a][b].wins += 1;
      result = "W";
    } else if (row.points < row.opponent_points) {
      summary[a][b].losses += 1;
      result = "L";
    } else {
      summary[a][b].ties += 1;
      result = "T";
    }

    games[a][b].push({
      matchup_id: row.matchup_id,
      game_id: canonicalIds.get(row.matchup_id) ?? row.matchup_id,
      season_year: row.season_year,
      week: row.week,
      points: row.points,
      opponent_points: row.opponent_points,
      result,
      game_type: headToHeadGameType(row),
    });
  }

  for (const a of Object.keys(games)) {
    for (const b of Object.keys(games[a])) {
      games[a][b].sort((x, y) => x.season_year - y.season_year || x.week - y.week);
    }
  }

  return { summary, games };
}

export type PlayerPerformance = {
  matchup_id: string; // per-team id -- internal join key only, do not link with this
  game_id: string; // canonical home_matchup_id, safe to use in /games/[id] links
  sleeper_player_id: string | null;
  player_name: string | null;
  position: string | null;
  points: number | null;
  projected_points: number | null;
  started: boolean;
  team_season_id: string;
  team_name: string | null;
  manager_name: string;
  season_year: number;
  week: number;
  opponent_team_name: string | null;
  opponent_manager_name: string | null;
};

// Every individual lineup entry with real points, joined against
// team_game_scores for week/season/opponent context, with matchup ids
// translated to the canonical home_matchup_id for safe /games/[id] links.
//
// IMPORTANT: filters out points = 0, not just points IS NULL. The 2026
// season's lineup rows are created with points defaulting to 0 before games
// are played (same premature-sync pattern as the career_stats bug fixed
// earlier) -- there are currently ~6,700 such zero-point rows vs. ~3,350
// real scored performances. Without this filter, PostgREST's default
// 1,000-row cap (no .order()/.range() was set) returned ONLY zero-point
// rows, which is why every player showed 0.0 on the Players tab.
export async function getAllPlayerPerformances(): Promise<PlayerPerformance[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const [{ data: lineupRows, error: lineupError }, { data: contextRows, error: contextError }, canonicalIds] =
    await Promise.all([
      supabase
        .from("lineups")
        .select(
          "matchup_id, sleeper_player_id, player_name, position, points, projected_points, started, team_season_id"
        )
        .not("points", "is", null)
        .gt("points", 0)
        .order("points", { ascending: false })
        .limit(5000),
      supabase
        .from("team_game_scores")
        .select(
          "matchup_id, season_year, week, team_name, manager_name, opponent_team_name, opponent_manager_name"
        ),
      getCanonicalMatchupIdMap(),
    ]);

  if (lineupError || !lineupRows || contextError || !contextRows) return [];

  const contextByMatchup = new Map<string, any>();
  for (const row of contextRows as any[]) {
    contextByMatchup.set(row.matchup_id, row);
  }

  const performances: PlayerPerformance[] = [];
  for (const l of lineupRows as any[]) {
    const ctx = contextByMatchup.get(l.matchup_id);
    if (!ctx) continue;
    performances.push({
      matchup_id: l.matchup_id,
      game_id: canonicalIds.get(l.matchup_id) ?? l.matchup_id,
      sleeper_player_id: l.sleeper_player_id,
      player_name: l.player_name,
      position: l.position,
      points: l.points,
      projected_points: l.projected_points,
      started: l.started,
      team_season_id: l.team_season_id,
      team_name: ctx.team_name,
      manager_name: ctx.manager_name,
      season_year: ctx.season_year,
      week: ctx.week,
      opponent_team_name: ctx.opponent_team_name,
      opponent_manager_name: ctx.opponent_manager_name,
    });
  }

  return performances;
}

// League-wide standard deviation of a single team's weekly score, computed
// from every played game. Used as the spread of the normal distribution
// behind the betting-line win probabilities below. Falls back to a generic
// assumption if there isn't enough played history yet.
export async function getLeagueScoreStdDev(): Promise<number> {
  const scores = await getAllTeamGameScores();
  const points = scores.map((s) => s.points).filter((p): p is number => p != null);
  if (points.length < 2) return 20;
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  const variance =
    points.reduce((sum, p) => sum + (p - mean) ** 2, 0) / (points.length - 1);
  return Math.sqrt(variance);
}

// Standard normal CDF via the Abramowitz-Stegun erf approximation (no stats
// library available in this environment).
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.SQRT2;
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * absZ);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
  return 0.5 * (1 + sign * y);
}

function probToMoneyline(p: number): number {
  const clamped = Math.min(Math.max(p, 0.001), 0.999);
  if (clamped >= 0.5) return Math.round(-100 * (clamped / (1 - clamped)));
  return Math.round(100 * ((1 - clamped) / clamped));
}

export type ProjectedLine = {
  matchup_id: string;
  week: number;
  home_manager_name: string;
  home_team_name: string | null;
  home_projected: number;
  away_manager_name: string;
  away_team_name: string | null;
  away_projected: number;
  home_win_prob: number;
  home_moneyline: number;
  away_moneyline: number;
  spread: number; // positive = home favored by this many points
  over_under: number;
};

// Betting-style lines for every unplayed game in a season that currently has
// projections synced (Sleeper generally only has projections for the next
// unplayed week, not the whole remaining schedule -- games further out will
// simply be absent from the returned list until their projections exist).
export async function getProjectedLines(year: number): Promise<ProjectedLine[]> {
  const [games, sigma] = await Promise.all([
    getGamesForSeason(year),
    getLeagueScoreStdDev(),
  ]);
  const combinedSigma = sigma * Math.SQRT2;

  const lines: ProjectedLine[] = [];
  for (const g of games) {
    if (g.game_played || !g.away_team_season_id) continue;
    if (g.home_projected_points == null || g.away_projected_points == null) continue;

    const diff = g.home_projected_points - g.away_projected_points;
    const homeWinProb = normalCdf(diff / combinedSigma);

    lines.push({
      matchup_id: g.home_matchup_id,
      week: g.week,
      home_manager_name: g.home_manager_name,
      home_team_name: g.home_team_name,
      home_projected: g.home_projected_points,
      away_manager_name: g.away_manager_name ?? "Unknown",
      away_team_name: g.away_team_name,
      away_projected: g.away_projected_points,
      home_win_prob: homeWinProb,
      home_moneyline: probToMoneyline(homeWinProb),
      away_moneyline: probToMoneyline(1 - homeWinProb),
      spread: Math.round(diff * 2) / 2,
      over_under: Math.round((g.home_projected_points + g.away_projected_points) * 2) / 2,
    });
  }
  return lines;
}

export type ProjectedStandingsRow = StandingsRow & {
  projected_additional_wins: number;
  projected_final_wins: number;
  games_with_projections: number;
};

// Current standings plus each team's win total nudged forward by the win
// probability of every game that currently has a projection available. This
// is necessarily partial -- see the caveat on getProjectedLines -- it is NOT
// a full rest-of-season projection, only what's projectable right now.
export async function getProjectedWinTotals(year: number): Promise<ProjectedStandingsRow[]> {
  const [standings, lines] = await Promise.all([
    getStandingsForSeason(year),
    getProjectedLines(year),
  ]);

  const addedWins = new Map<string, number>();
  const gameCounts = new Map<string, number>();

  for (const line of lines) {
    addedWins.set(
      line.home_manager_name,
      (addedWins.get(line.home_manager_name) ?? 0) + line.home_win_prob
    );
    addedWins.set(
      line.away_manager_name,
      (addedWins.get(line.away_manager_name) ?? 0) + (1 - line.home_win_prob)
    );
    gameCounts.set(line.home_manager_name, (gameCounts.get(line.home_manager_name) ?? 0) + 1);
    gameCounts.set(line.away_manager_name, (gameCounts.get(line.away_manager_name) ?? 0) + 1);
  }

  return standings
    .map((row) => {
      const additional = addedWins.get(row.manager_name) ?? 0;
      return {
        ...row,
        projected_additional_wins: additional,
        projected_final_wins: row.wins + additional,
        games_with_projections: gameCounts.get(row.manager_name) ?? 0,
      };
    })
    .sort((a, b) => b.projected_final_wins - a.projected_final_wins);
}

export type DraftPick = {
  id: string;
  draft_id: string;
  draft_type: "initial" | "rookie";
  sleeper_draft_type: string | null; // Sleeper's own draft mechanic: "auction" | "snake" | "linear"
  season_year: number;
  round: number;
  pick_no: number;
  sleeper_player_id: string | null;
  player_name: string | null;
  position: string | null;
  is_keeper: boolean;
  team_season_id: string | null;
  team_name: string | null;
  manager_name: string | null;
};

// Every draft pick ever synced, across the initial (startup) draft and every
// subsequent rookie draft. Reads from draft_picks_view, which joins
// drafts + draft_picks + seasons + team_seasons + managers so the caller
// doesn't need to do that stitching. Populated by the draft-sync block in
// syncSleeper.ts -- empty until that has run at least once.
export async function getDraftHistory(): Promise<DraftPick[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("draft_picks_view")
    .select("*")
    .order("season_year", { ascending: false })
    .order("round", { ascending: true })
    .order("pick_no", { ascending: true })
    .limit(5000);
  if (error || !data) return [];
  return data as DraftPick[];
}

export type TradeItem = {
  team_season_id: string | null;
  team_name: string | null;
  manager_name: string | null;
  item_type: "player" | "draft_pick";
  sleeper_player_id: string | null;
  player_name: string | null;
  position: string | null;
  traded_pick_season: number | null;
  traded_pick_round: number | null;
  original_manager_id: string | null;
  original_manager_name: string | null;
  previous_team_season_id: string | null;
  previous_team_name: string | null;
};

export type Trade = {
  trade_id: string;
  season_year: number;
  week: number;
  status_updated: string;
  items: TradeItem[];
};

// Every trade ever synced, most recent first, reconstructed from
// trades_view (one row per traded item -- grouped back into one Trade per
// trade_id here). Populated by the trade-sync block in syncSleeper.ts, plus
// a handful of 2025-season trades imported directly from a manually-kept
// CSV (the sync's automatic backfill for the pre-2026 league was never
// wired up -- see the draft-history backfill note for the same unresolved
// gap). League trade volume is small enough that fetching everything and
// grouping in JS is simpler than paginating.
export async function getAllTrades(): Promise<Trade[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trades_view")
    .select("*")
    .order("status_updated", { ascending: false })
    .limit(2000);
  if (error || !data) return [];

  const byTrade = new Map<string, Trade>();
  for (const row of data as any[]) {
    if (!byTrade.has(row.trade_id)) {
      byTrade.set(row.trade_id, {
        trade_id: row.trade_id,
        season_year: row.season_year,
        week: row.week,
        status_updated: row.status_updated,
        items: [],
      });
    }
    byTrade.get(row.trade_id)!.items.push({
      team_season_id: row.team_season_id,
      team_name: row.team_name,
      manager_name: row.manager_name,
      item_type: row.item_type,
      sleeper_player_id: row.sleeper_player_id,
      player_name: row.player_name,
      position: row.position,
      traded_pick_season: row.traded_pick_season,
      traded_pick_round: row.traded_pick_round,
      original_manager_id: row.original_manager_id,
      original_manager_name: row.original_manager_name,
      previous_team_season_id: row.previous_team_season_id,
      previous_team_name: row.previous_team_name,
    });
  }

  return Array.from(byTrade.values()).sort(
    (a, b) => new Date(b.status_updated).getTime() - new Date(a.status_updated).getTime()
  );
}

export async function getRecentTrades(limit = 10): Promise<Trade[]> {
  const all = await getAllTrades();
  return all.slice(0, limit);
}

function formatTradeLine(trade: Trade): string {
  const byTeam = new Map<string, TradeItem[]>();
  for (const item of trade.items) {
    const key = item.team_name ?? item.manager_name ?? "Unknown team";
    (byTeam.get(key) ?? byTeam.set(key, []).get(key)!).push(item);
  }
  const sides = Array.from(byTeam.entries()).map(([team, items]) => {
    const names = items.map((i) =>
      i.item_type === "player"
        ? i.player_name ?? "a player"
        : `a ${i.traded_pick_season ?? ""} Round ${i.traded_pick_round ?? "?"} pick`
    );
    return `${team} get ${names.join(", ")}`;
  });
  return `Trade: ${sides.join(" · ")} (Week ${trade.week})`;
}

export type TickerItem = {
  id: string;
  text: string;
  href: string | null;
};

function formatGameLine(g: GameResult): string {
  const home = g.home_team_name ?? g.home_manager_name;
  const away = g.away_team_name ?? g.away_manager_name ?? "Unknown";
  const homePts = g.home_points ?? 0;
  const awayPts = g.away_points ?? 0;
  const winner = homePts >= awayPts ? home : away;
  const loser = winner === home ? away : home;
  const winnerPts = winner === home ? homePts : awayPts;
  const loserPts = winner === home ? awayPts : homePts;
  return `${winner} topped ${loser} ${winnerPts.toFixed(1)}–${loserPts.toFixed(1)} (Week ${g.week})`;
}

// Builds the homepage ticker's items: most recent completed week's results,
// season-so-far records (high score, biggest margin), currently-clinched
// playoff teams, a short power ranking from the same projected-win-totals
// model already used on Betting, and the most recent trades. Everything
// here reuses data already proven reliable elsewhere in the app -- no new
// tables except trades, which is empty (and simply produces no ticker
// items) until its sync has run.
//
// Note on clinches: this reports teams CURRENTLY flagged made_playoffs, not
// the moment a team clinched -- the sync doesn't snapshot standings history,
// so a "just clinched" event can't be detected yet.
export async function getTickerItems(): Promise<TickerItem[]> {
  const years = await getSeasonYears();
  const currentYear = years[0];
  if (currentYear == null) return [];

  const [games, standings, trades, projected] = await Promise.all([
    getGamesForSeason(currentYear),
    getStandingsForSeason(currentYear),
    getRecentTrades(5),
    getProjectedWinTotals(currentYear),
  ]);

  const played = games.filter((g) => g.game_played && g.away_team_season_id);
  const items: TickerItem[] = [];

  if (played.length > 0) {
    const latestWeek = Math.max(...played.map((g) => g.week));
    const weekGames = played.filter((g) => g.week === latestWeek);
    for (const g of weekGames) {
      items.push({
        id: `game-${g.home_matchup_id}`,
        text: formatGameLine(g),
        href: `/games/${g.home_matchup_id}`,
      });
    }

    let highScoreGame = played[0];
    let highScoreVal = -1;
    let blowoutGame = played[0];
    let blowoutMargin = -1;
    for (const g of played) {
      const home = g.home_points ?? 0;
      const away = g.away_points ?? 0;
      if (home > highScoreVal) {
        highScoreVal = home;
        highScoreGame = g;
      }
      if (away > highScoreVal) {
        highScoreVal = away;
        highScoreGame = g;
      }
      const margin = Math.abs(home - away);
      if (margin > blowoutMargin) {
        blowoutMargin = margin;
        blowoutGame = g;
      }
    }
    items.push({
      id: `record-high-${highScoreGame.home_matchup_id}`,
      text: `Season high: ${highScoreVal.toFixed(1)} points in Week ${highScoreGame.week}`,
      href: `/games/${highScoreGame.home_matchup_id}`,
    });
    items.push({
      id: `record-blowout-${blowoutGame.home_matchup_id}`,
      text: `Biggest margin so far: ${blowoutMargin.toFixed(1)} points in Week ${blowoutGame.week}`,
      href: `/games/${blowoutGame.home_matchup_id}`,
    });
  }

  // Gated behind played.length > 0 -- with zero games played this season,
  // any made_playoffs=true would necessarily be stale/incorrect carryover,
  // so don't surface it even if it somehow occurs.
  const clinched = played.length > 0 ? standings.filter((s) => s.made_playoffs) : [];
  for (const team of clinched) {
    items.push({
      id: `clinch-${team.team_season_id}`,
      text: `${team.team_name ?? team.manager_name} has clinched a playoff spot`,
      href: `/standings`,
    });
  }

  const topRanked = [...projected]
    .sort((a, b) => b.projected_final_wins - a.projected_final_wins)
    .slice(0, 3);
  topRanked.forEach((team, i) => {
    items.push({
      id: `rank-${team.team_season_id}`,
      text: `#${i + 1} power ranking: ${team.team_name ?? team.manager_name} (${team.projected_final_wins.toFixed(1)} proj. wins)`,
      href: `/betting`,
    });
  });

  for (const trade of trades) {
    items.push({
      id: `trade-${trade.trade_id}`,
      text: formatTradeLine(trade),
      href: null,
    });
  }

  return items;
}
export type LineageHop =
  | {
      kind: "trade";
      from_team: string | null;
      to_team: string | null;
      asset_label: string;
    }
  | {
      kind: "drafted";
      season_year: number;
      round: number;
      pick_label: string; // e.g. "2.10" -- round.pick-within-round, not the overall pick number
      team_name: string | null;
      player_name: string | null;
    };

type Asset =
  | { kind: "player"; sleeperPlayerId: string | null; playerName: string | null }
  | { kind: "draft_pick"; originalManagerId: string; season: number; round: number };

function itemLabelFromRow(row: any): string {
  return row.item_type === "player"
    ? row.player_name ?? "a player"
    : `${row.traded_pick_season} Round ${row.traded_pick_round} pick`;
}

async function getTotalRostersForYear(year: number): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("seasons").select("total_rosters").eq("year", year).maybeSingle();
  return (data as any)?.total_rosters ?? null;
}

// Finds the next time this exact asset was traded away, strictly after
// `after`. Scoping a pick by (season, round, originalManagerId) and a
// player by sleeper_player_id (or name, for the pre-2026 CSV import) always
// identifies one specific, unambiguous asset, even when a team holds
// several picks of the same round in the same season.
async function findNextTradeAway(asset: Asset, after: string): Promise<any | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let query = supabase
    .from("trades_view")
    .select("*")
    .gt("status_updated", after)
    .order("status_updated", { ascending: true })
    .limit(1);

  if (asset.kind === "player") {
    if (!asset.sleeperPlayerId && !asset.playerName) return null;
    query = query.eq("item_type", "player");
    query = asset.sleeperPlayerId
      ? query.eq("sleeper_player_id", asset.sleeperPlayerId)
      : query.eq("player_name", asset.playerName as string);
  } else {
    query = query
      .eq("item_type", "draft_pick")
      .eq("traded_pick_season", asset.season)
      .eq("traded_pick_round", asset.round)
      .eq("original_manager_id", asset.originalManagerId);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

// The core of the feature: follows an asset forward through time. Whenever
// it's traded away, this does NOT just record where it physically went --
// it pivots to whatever the sending team received INSTEAD in that same
// trade, and continues tracing THAT forward. A drafted player is treated
// exactly the same way once a pick resolves into one: if that player is
// later traded, the chain keeps pivoting to what was received for him, all
// the way down. A pick that's simply held until draft day (never re-traded)
// resolves via draft_picks_view, matched by (season, round,
// originalManagerId) -- this is now unambiguous even when a team holds
// multiple picks of the same round in the same season, unlike the
// season+round+final-holder matching this used before.
async function traceForward(asset: Asset, after: string, depth: number): Promise<LineageHop[]> {
  if (depth > 12) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const nextTrade = await findNextTradeAway(asset, after);

  if (nextTrade) {
    const senderTeamSeasonId = nextTrade.previous_team_season_id;
    if (!senderTeamSeasonId) {
      // Can't identify who sent it (a data gap on an older trade) -- fall
      // back to just showing the move itself rather than dead-ending.
      return [
        {
          kind: "trade",
          from_team: nextTrade.previous_team_name,
          to_team: nextTrade.team_name,
          asset_label: itemLabelFromRow(nextTrade),
        },
      ];
    }

    const { data: exchangedItems } = await supabase
      .from("trades_view")
      .select("*")
      .eq("trade_id", nextTrade.trade_id)
      .eq("team_season_id", senderTeamSeasonId);

    const hops: LineageHop[] = [];
    for (const item of exchangedItems ?? []) {
      hops.push({
        kind: "trade",
        from_team: item.previous_team_name,
        to_team: item.team_name,
        asset_label: `Received: ${itemLabelFromRow(item)}`,
      });
      const childAsset: Asset =
        item.item_type === "player"
          ? { kind: "player", sleeperPlayerId: item.sleeper_player_id, playerName: item.player_name }
          : {
              kind: "draft_pick",
              originalManagerId: item.original_manager_id,
              season: item.traded_pick_season,
              round: item.traded_pick_round,
            };
      hops.push(...(await traceForward(childAsset, item.status_updated, depth + 1)));
    }
    return hops;
  }

  // Not traded further. If it's a pick, check whether it's actually been
  // used in the draft yet.
  if (asset.kind === "draft_pick") {
    const { data: draftRow } = await supabase
      .from("draft_picks_view")
      .select("*")
      .eq("season_year", asset.season)
      .eq("round", asset.round)
      .eq("original_manager_id", asset.originalManagerId)
      .maybeSingle();
    if (!draftRow) return [];

    const totalRosters = await getTotalRostersForYear(asset.season);
    const pickLabel = totalRosters
      ? `${asset.round}.${((draftRow as any).pick_no - 1) % totalRosters + 1}`
      : String((draftRow as any).pick_no);

    const draftedHop: LineageHop = {
      kind: "drafted",
      season_year: (draftRow as any).season_year,
      round: (draftRow as any).round,
      pick_label: pickLabel,
      team_name: (draftRow as any).team_name,
      player_name: (draftRow as any).player_name,
    };

    const playerHops = await traceForward(
      {
        kind: "player",
        sleeperPlayerId: (draftRow as any).sleeper_player_id,
        playerName: (draftRow as any).player_name,
      },
      "1970-01-01T00:00:00Z",
      depth + 1
    );
    return [draftedHop, ...playerHops];
  }

  return [];
}

// Traces an asset's OWN onward journey from the point it was received --
// used for the "Received" side of a trade card. `since` should be the
// current trade's date, so this only looks at what happens AFTER landing
// here rather than replaying this pick/player's earlier history too.
export async function getAssetLineage(
  input:
    | { kind: "player"; sleeperPlayerId: string | null; playerName: string | null; since: string }
    | { kind: "draft_pick"; originalManagerId: string; season: number; round: number; since: string }
): Promise<LineageHop[]> {
  if (input.kind === "player") {
    return traceForward(
      { kind: "player", sleeperPlayerId: input.sleeperPlayerId, playerName: input.playerName },
      input.since,
      0
    );
  }
  return traceForward(
    { kind: "draft_pick", originalManagerId: input.originalManagerId, season: input.season, round: input.round },
    input.since,
    0
  );
}

// The "Gave up" side: given what a team sent away in a specific trade,
// finds what they received in exchange (there may be more than one item)
// and traces each forward from there via the same pivot-on-every-trade
// logic as traceForward.
export async function getGivenUpAssetLineage(
  tradeId: string,
  sentByTeamSeasonId: string
): Promise<LineageHop[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("trades_view")
    .select("*")
    .eq("trade_id", tradeId)
    .eq("team_season_id", sentByTeamSeasonId);
  if (error || !data) return [];

  const hops: LineageHop[] = [];
  for (const row of data as any[]) {
    hops.push({
      kind: "trade",
      from_team: row.previous_team_name,
      to_team: row.team_name,
      asset_label: `Received: ${itemLabelFromRow(row)}`,
    });
    const childAsset: Asset =
      row.item_type === "player"
        ? { kind: "player", sleeperPlayerId: row.sleeper_player_id, playerName: row.player_name }
        : {
            kind: "draft_pick",
            originalManagerId: row.original_manager_id,
            season: row.traded_pick_season,
            round: row.traded_pick_round,
          };
    hops.push(...(await traceForward(childAsset, row.status_updated, 0)));
  }
  return hops;
}
