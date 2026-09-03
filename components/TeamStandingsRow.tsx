"use client";

import { useState } from "react";
import Link from "next/link";
import type { StandingsRow, GameResult } from "@/lib/queries";

export function TeamStandingsRow({ team, games }: { team: StandingsRow; games: GameResult[] }) {
  const [open, setOpen] = useState(false);
  const isChampion = team.final_rank === 1;

  return (
    <>
      <tr
        className="border-t border-[rgba(32,32,15,0.12)] cursor-pointer hover:bg-[rgba(32,32,15,0.03)]"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.55)]">
          {team.final_rank ?? team.regular_season_rank ?? "—"}
        </td>
        <td className="px-4 py-2.5">
          <p className={`font-body ${isChampion ? "text-[var(--color-gold)] font-bold" : ""}`}>
            {isChampion && "🏆 "}
            {team.team_name ?? team.manager_name}
          </p>
          <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{team.manager_name}</p>
        </td>
        <td className="px-4 py-2.5 font-mono text-right">{team.wins}</td>
        <td className="px-4 py-2.5 font-mono text-right">{team.losses}</td>
        <td className="px-4 py-2.5 font-mono text-right">
          {team.points_for != null ? team.points_for.toFixed(1) : "—"}
        </td>
        <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.6)]">
          {team.points_against != null ? team.points_against.toFixed(1) : "—"}
        </td>
      </tr>
      {open && (
        <tr className="border-t border-[rgba(32,32,15,0.12)]">
          <td colSpan={6} className="px-4 py-3 bg-[rgba(32,32,15,0.03)]">
            {games.length === 0 ? (
              <p className="font-mono text-xs opacity-60">No games found.</p>
            ) : (
              <div className="space-y-1.5">
                {games.map((g) => {
                  const isHome = g.home_team_season_id === team.team_season_id;
                  const teamPts = isHome ? g.home_points : g.away_points;
                  const oppPts = isHome ? g.away_points : g.home_points;
                  const oppName = isHome
                    ? g.away_team_name ?? g.away_manager_name
                    : g.home_team_name ?? g.home_manager_name;
                  const played = g.game_played && teamPts != null && oppPts != null;
                  const won = played && (teamPts ?? 0) > (oppPts ?? 0);
                  return (
                    <Link
                      key={g.home_matchup_id}
                      href={`/games/${g.home_matchup_id}`}
                      className="flex items-center justify-between text-sm font-mono px-2 py-1.5 rounded hover:bg-[rgba(32,32,15,0.06)]"
                    >
                      <span>
                        Week {g.week}
                        {oppName ? ` vs ${oppName}` : " (Bye)"}
                        {g.round_game ? ` — ${g.round_game}` : ""}
                      </span>
                      <span className={won ? "text-[var(--color-gold)] font-bold" : ""}>
                        {played ? `${(teamPts ?? 0).toFixed(1)} - ${(oppPts ?? 0).toFixed(1)}` : "—"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
