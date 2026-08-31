// Every individual lineup entry with real points, joined against
// team_game_scores for week/season/opponent context, with matchup ids
// translated to the canonical home_matchup_id for safe /games/[id] links.
//
// IMPORTANT: filters out points = 0, not just points IS NULL. The 2026
// season's lineup rows are created with points defaulting to 0 before games
// are played (same premature-sync pattern as the career_stats bug fixed
// this session) -- there are currently ~6,700 such zero-point rows vs.
// ~3,350 real scored performances. Without this filter, PostgREST's default
// 1,000-row cap (no .order()/.range() was set) returned ONLY zero-point
// rows, which is why every player showed 0.0.
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
