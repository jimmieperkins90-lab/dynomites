import { getSupabase } from "@/lib/supabase";
import { getStandingsForSeason } from "@/lib/queries";

export const dynamic = "force-dynamic";

// TEMPORARY DIAGNOSTIC ROUTE -- delete once the team-name mismatch is
// resolved. Runs three independent checks against the exact known team, to
// isolate whether a stale value is coming from the raw table, the app's own
// query function, or something else entirely:
//   1. A raw select by the team's known primary key id, bypassing every
//      layer of app logic (getStandingsForSeason, joins, etc).
//   2. The exact same select getStandingsForSeason() runs internally.
//   3. getStandingsForSeason() itself, filtered to the team in question.
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "getSupabase() returned null -- env vars missing" });
  }

  const KNOWN_TEAM_ID = "394c5ab5-e82d-4df7-95fb-909b3fef0016"; // 2026 season row, confirmed via direct SQL

  const rawById = await supabase
    .from("team_seasons")
    .select("id, team_name, season_id")
    .eq("id", KNOWN_TEAM_ID)
    .maybeSingle();

  const rawJoinSelect = await supabase
    .from("team_seasons")
    .select(
      "id, team_name, division, wins, losses, ties, points_for, points_against, regular_season_rank, final_rank, made_playoffs, managers(display_name, real_name, avatar)"
    )
    .eq("id", KNOWN_TEAM_ID)
    .maybeSingle();

  const standings2026 = await getStandingsForSeason(2026);
  const viaStandingsFn = standings2026.find((s) => s.team_season_id === KNOWN_TEAM_ID) ?? null;

  return Response.json({
    raw_by_id: { data: rawById.data, error: rawById.error?.message ?? null },
    raw_join_select: { data: rawJoinSelect.data, error: rawJoinSelect.error?.message ?? null },
    via_getStandingsForSeason: viaStandingsFn,
    standings_row_count: standings2026.length,
  });
}
