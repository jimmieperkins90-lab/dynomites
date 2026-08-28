import { createClient } from "@supabase/supabase-js";
import {
  getLeague,
  getUsers,
  getRosters,
  getMatchups,
  getWinnersBracket,
  getLosersBracket,
  getPlayerMap,
  getWeekProjections,
  type SleeperMatchup,
  type BracketMatch,
  type PlayerProjections,
} from "./sleeper";

type Logger = (line: string) => void;

export async function runSleeperSync(
  opts: {
    supabaseUrl: string;
    serviceRoleKey: string;
    leagueId: string;
  },
  log: Logger = console.log
) {
  const { supabaseUrl, serviceRoleKey, leagueId } = opts;
  // Service role key bypasses RLS -- this is the only thing that writes.
  const db = createClient(supabaseUrl, serviceRoleKey);

  log(`Syncing Sleeper league ${leagueId}...`);

  const league = await getLeague(leagueId);
  const year = Number(league.season);
  log(
    `League: ${league.name} (${league.season}), status=${league.status}, previous_league_id=${league.previous_league_id}`
  );

  // ---- seasons -------------------------------------------------------
  const { data: season, error: seasonErr } = await db
    .from("seasons")
    .upsert(
      {
        year,
        sleeper_league_id: league.league_id,
        previous_sleeper_league_id: league.previous_league_id,
        total_rosters: league.total_rosters,
        status: league.status,
        playoff_week_start: league.settings?.playoff_week_start ?? null,
      },
      { onConflict: "sleeper_league_id" }
    )
    .select()
    .single();
  if (seasonErr) throw seasonErr;

  // ---- managers --------------------------------------------------------
  const users = await getUsers(leagueId);
  const managerIdByUserId = new Map<string, string>();

  for (const u of users) {
    const { data: manager, error } = await db
      .from("managers")
      .upsert(
        { sleeper_user_id: u.user_id, display_name: u.display_name, avatar: u.avatar },
        { onConflict: "sleeper_user_id" }
      )
      .select()
      .single();
    if (error) throw error;
    managerIdByUserId.set(u.user_id, manager.id);
  }

  // ---- team_seasons ------------------------------------------------------
  const rosters = await getRosters(leagueId);
  const teamSeasonIdByRosterId = new Map<number, string>();

  for (const r of rosters) {
    const managerId = r.owner_id ? managerIdByUserId.get(r.owner_id) : undefined;
    if (!managerId) {
      log(`Roster ${r.roster_id} has no matching manager (owner_id=${r.owner_id}), skipping.`);
      continue;
    }
    const teamName = users.find((u) => u.user_id === r.owner_id)?.metadata?.team_name ?? null;

    const { data: ts, error } = await db
      .from("team_seasons")
      .upsert(
        {
          season_id: season.id,
          manager_id: managerId,
          sleeper_roster_id: r.roster_id,
          team_name: teamName,
          wins: r.settings.wins,
          losses: r.settings.losses,
          ties: r.settings.ties,
          points_for: r.settings.fpts + (r.settings.fpts_decimal ?? 0) / 100,
          points_against: r.settings.fpts_against + (r.settings.fpts_against_decimal ?? 0) / 100,
          regular_season_rank: r.settings.rank ?? null,
        },
        { onConflict: "season_id,sleeper_roster_id" }
      )
      .select()
      .single();
    if (error) throw error;
    teamSeasonIdByRosterId.set(r.roster_id, ts.id);
  }

  // ---- playoff brackets (best-effort phase/round labeling) --------------
  // NOTE: bracket JSON shape (the `p` placement field especially) varies by
  // league settings (3rd-place game on/off, # of playoff teams). This is a
  // reasonable default -- once this league's first playoffs happen, verify
  // the actual shape and adjust labels if they don't look right.
  const playoffWeekStart = league.settings?.playoff_week_start ?? null;
  const roundLabel = (r: number, maxR: number, p?: number) => {
    if (p === 3) return "3rd Place";
    if (r === maxR) return "Championship";
    if (r === maxR - 1) return "Semifinal";
    return `Round ${r}`;
  };

    const bracketMatchupInfo = new Map<number, { phase: "winners_bracket" | "losers_bracket"; week: number; round_game: string }>();

  async function indexBracket(bracket: BracketMatch[], phase: "winners_bracket" | "losers_bracket") {
    if (!bracket.length || playoffWeekStart == null) return;
    const maxR = Math.max(...bracket.map((m) => m.r));
    for (const m of bracket) {
      const week = playoffWeekStart + (m.r - 1);
      const label = roundLabel(m.r, maxR, m.p);
      for (const rosterId of [m.t1, m.t2]) {
        if (rosterId != null) {
          bracketMatchupInfo.set(rosterId * 1000 + week, { phase, week, round_game: label });
        }
      }
      if (m.r === maxR && m.w != null && m.l != null) {
        const winnerRank = phase === "winners_bracket" ? (m.p === 3 ? 3 : 1) : null;
        const loserRank = phase === "winners_bracket" ? (m.p === 3 ? 4 : 2) : null;
        if (winnerRank) {
          const tsId = teamSeasonIdByRosterId.get(m.w);
          if (tsId) await db.from("team_seasons").update({ final_rank: winnerRank, made_playoffs: true }).eq("id", tsId);
        }
        if (loserRank) {
          const tsId = teamSeasonIdByRosterId.get(m.l);
          if (tsId) await db.from("team_seasons").update({ final_rank: loserRank, made_playoffs: true }).eq("id", tsId);
        }
      }
      if (phase === "winners_bracket") {
        for (const rosterId of [m.t1, m.t2]) {
          if (rosterId != null) {
            const tsId = teamSeasonIdByRosterId.get(rosterId);
            if (tsId) await db.from("team_seasons").update({ made_playoffs: true }).eq("id", tsId);
          }
        }
      }
    }
  }

  try {
    await indexBracket(await getWinnersBracket(leagueId), "winners_bracket");
    await indexBracket(await getLosersBracket(leagueId), "losers_bracket");
  } catch (e) {
    log(`Bracket fetch/parse failed (likely no playoffs yet this season): ${e}`);
  }

  // ---- matchups + lineups, week by week ----------------------------------
  const playerMap = await getPlayerMap();
  const cachedPlayerIds = new Set<string>();

  for (let week = 1; week <= 18; week++) {
    let weekMatchups: SleeperMatchup[];
    try {
      weekMatchups = await getMatchups(leagueId, week);
    } catch (e) {
      log(`Week ${week}: fetch failed, stopping. ${e}`);
      break;
    }
    if (!weekMatchups.length) {
      log(`Week ${week}: no data yet, stopping sync.`);
      break;
    }

    // Player projections for this week (used to fill in projected_points on
    // lineup rows for games that haven't been played yet). Best-effort --
    // an unofficial endpoint failing shouldn't take down the whole sync.
    let weekProjections: PlayerProjections = {};
    try {
      weekProjections = await getWeekProjections(String(year), week);
    } catch (e) {
      log(`Week ${week}: projections fetch failed, continuing without them. ${e}`);
    }

    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of weekMatchups) {
      if (m.matchup_id == null) continue;
      const arr = byMatchupId.get(m.matchup_id) ?? [];
      arr.push(m);
      byMatchupId.set(m.matchup_id, arr);
    }

    const anyPointsThisWeek = weekMatchups.some((m) => m.points > 0);

    for (const [sleeperMatchupId, pair] of byMatchupId) {
      const [a, b] = pair;
      const teamSeasonA = teamSeasonIdByRosterId.get(a.roster_id);
      const teamSeasonB = b ? teamSeasonIdByRosterId.get(b.roster_id) : undefined;
      if (!teamSeasonA) continue;

      const bracketInfoA = bracketMatchupInfo.get(a.roster_id * 1000 + week);
      const isPlayoffWeek = playoffWeekStart != null && week >= playoffWeekStart;

      const rowsToUpsert = [
        {
          season_id: season.id,
          week,
          team_season_id: teamSeasonA,
          opponent_team_season_id: teamSeasonB ?? null,
          sleeper_matchup_id: sleeperMatchupId,
          points: a.points,
          opponent_points: b?.points ?? null,
          game_played: anyPointsThisWeek,
          is_playoff: isPlayoffWeek,
          phase: bracketInfoA?.phase ?? (isPlayoffWeek ? null : "regular"),
          round_game: bracketInfoA?.round_game ?? null,
        },
      ];

      if (b && teamSeasonB) {
        const bracketInfoB = bracketMatchupInfo.get(b.roster_id * 1000 + week);
        rowsToUpsert.push({
          season_id: season.id,
          week,
          team_season_id: teamSeasonB,
          opponent_team_season_id: teamSeasonA,
          sleeper_matchup_id: sleeperMatchupId,
          points: b.points,
          opponent_points: a.points,
          game_played: anyPointsThisWeek,
          is_playoff: isPlayoffWeek,
          phase: bracketInfoB?.phase ?? (isPlayoffWeek ? null : "regular"),
          round_game: bracketInfoB?.round_game ?? null,
        });
      }

      const { data: insertedMatchups, error: matchupErr } = await db
        .from("matchups")
        .upsert(rowsToUpsert, { onConflict: "season_id,week,team_season_id" })
        .select();
      if (matchupErr) throw matchupErr;

      for (const raw of pair) {
        const teamSeasonId = teamSeasonIdByRosterId.get(raw.roster_id);
        const matchupRow = insertedMatchups.find((m) => m.team_season_id === teamSeasonId);
        if (!teamSeasonId || !matchupRow) continue;

        const starterSet = new Set(raw.starters);
        const lineupRows = raw.players
          .map((playerId) => {
            if (!playerMap[playerId]) return null;
            cachedPlayerIds.add(playerId);
            return {
              matchup_id: matchupRow.id,
              team_season_id: teamSeasonId,
              sleeper_player_id: playerId,
              player_name: playerMap[playerId].full_name,
              position: playerMap[playerId].position,
              points: raw.players_points?.[playerId] ?? null,
              projected_points: weekProjections[playerId] ?? null,
              started: starterSet.has(playerId),
            };
          })
          .filter(Boolean);

        if (lineupRows.length) {
          await db.from("lineups").delete().eq("matchup_id", matchupRow.id);
          const { error: lineupErr } = await db.from("lineups").insert(lineupRows as any[]);
          if (lineupErr) throw lineupErr;
        }
      }
    }

    log(`Week ${week}: synced ${byMatchupId.size} matchups.`);
  }

  // ---- players_cache (only players actually seen in a lineup) -----------
  const playerRows = [...cachedPlayerIds].map((id) => ({
    sleeper_player_id: id,
    full_name: playerMap[id].full_name,
    position: playerMap[id].position,
    nfl_team: playerMap[id].team,
  }));
  if (playerRows.length) {
    const { error } = await db.from("players_cache").upsert(playerRows, { onConflict: "sleeper_player_id" });
    if (error) throw error;
  }

  log("Sync complete.");
}
