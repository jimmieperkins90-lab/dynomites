import {
  getSeasonYears,
  getProjectedLines,
  getProjectedWinTotals,
  getLineResult,
  type ProjectedLine,
} from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatOdds(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function formatSpread(n: number): string {
  if (n === 0) return "PK";
  return n > 0 ? `-${n}` : `+${Math.abs(n)}`;
}

function groupByWeek(lines: ProjectedLine[]): { week: number; games: ProjectedLine[] }[] {
  const map = new Map<number, ProjectedLine[]>();
  for (const line of lines) {
    (map.get(line.week) ?? map.set(line.week, []).get(line.week)!).push(line);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, games]) => ({ week, games }));
}

// A week can be fully in the past, fully upcoming, or (most Sundays) a mix
// of both -- this drives the small status tag next to the week header so
// it's obvious at a glance which weeks are done vs. still open.
function weekStatus(games: ProjectedLine[]): "Final" | "In Progress" | "Upcoming" {
  const playedCount = games.filter((g) => g.game_played).length;
  if (playedCount === 0) return "Upcoming";
  if (playedCount === games.length) return "Final";
  return "In Progress";
}

export default async function BettingPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const years = await getSeasonYears();
  if (years.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="font-body opacity-70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const requestedYear = params.season ? parseInt(params.season, 10) : undefined;
  const activeYear = years.includes(requestedYear ?? -1) ? (requestedYear as number) : years[0];

  const [lines, winTotals] = await Promise.all([
    getProjectedLines(activeYear),
    getProjectedWinTotals(activeYear),
  ]);

  const weeks = groupByWeek(lines);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
        <h1 className="page-heading font-display text-4xl tracking-wide">Sportsbook</h1>
        <div className="flex gap-2">
          {years.map((year) => (
            <Link
              key={year}
              href={`/betting?season=${year}`}
              className={`font-mono text-sm px-3 py-1.5 border rounded ${
                year === activeYear
                  ? "bg-[var(--color-gold)] text-[var(--color-ink)] border-[var(--color-gold)] font-bold"
                  : "border-[rgba(32,32,15,0.3)] text-[rgba(32,32,15,0.65)] hover:border-[var(--color-gold)]"
              }`}
            >
              {year}
            </Link>
          ))}
        </div>
      </div>
      <p className="font-body text-sm text-[rgba(32,32,15,0.6)] mb-10">
        Lines and win totals are generated from your league&apos;s own projected lineups — not a real
        sportsbook. Only regular-season games with a synced projection are shown, so this typically
        covers the next several unplayed weeks rather than the full remaining schedule. Weeks stay
        listed after they&apos;re played, graded against the final score.
      </p>

      <section className="mb-12">
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Projected Win Totals</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">Team</th>
                <th className="px-4 py-3 font-normal text-right">Current W-L</th>
                <th className="px-4 py-3 font-normal text-right">Preseason Proj.</th>
                <th className="px-4 py-3 font-normal text-right">+Proj.</th>
                <th className="px-4 py-3 font-normal text-right">Current Proj.</th>
              </tr>
            </thead>
            <tbody>
              {winTotals.map((row) => (
                <tr key={row.team_season_id} className="border-t border-[rgba(32,32,15,0.12)]">
                  <td className="px-4 py-2.5 font-body">{row.team_name ?? row.manager_name}</td>
                  <td className="px-4 py-2.5 font-mono text-right">
                    {row.wins}-{row.losses}
                    {row.ties > 0 ? `-${row.ties}` : ""}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.5)]">
                    {row.preseason_projected_wins != null ? row.preseason_projected_wins.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.6)]">
                    {row.games_with_projections > 0 ? `+${row.projected_additional_wins.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-[var(--color-gold)] font-bold">
                    {row.projected_final_wins.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Lines by Week</h2>
        {weeks.length === 0 ? (
          <p className="font-body opacity-60">No projected games available right now.</p>
        ) : (
          <div className="space-y-3">
            {weeks.map(({ week, games }) => {
              const status = weekStatus(games);
              return (
                <details key={week} className="panel group">
                  <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg tracking-wide">Week {week}</span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                          status === "Final"
                            ? "bg-[rgba(32,32,15,0.08)] text-[rgba(32,32,15,0.55)]"
                            : status === "In Progress"
                            ? "bg-[var(--color-gold)] text-[var(--color-ink)]"
                            : "bg-[rgba(32,32,15,0.06)] text-[rgba(32,32,15,0.45)]"
                        }`}
                      >
                        {status}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-[rgba(32,32,15,0.5)]">
                      {games.length} game{games.length === 1 ? "" : "s"} · click to expand
                    </span>
                  </summary>
                  <div className="px-5 pb-5 space-y-4 border-t border-[rgba(32,32,15,0.12)] pt-4">
                    {games.map((line) => {
                      const result = getLineResult(line);
                      const homeName = line.home_team_name ?? line.home_manager_name;
                      const awayName = line.away_team_name ?? line.away_manager_name;

                      if (result) {
                        // Played -- show the final score and grade all three bet types.
                        return (
                          <div key={line.matchup_id} className="panel p-5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-[140px]">
                                <p
                                  className={`font-body font-bold ${
                                    result.moneyline === "home" ? "text-[var(--color-gold)]" : ""
                                  }`}
                                >
                                  {result.moneyline === "home" ? "✓ " : ""}
                                  {homeName}
                                </p>
                                <p className="font-mono text-lg font-bold mt-1">
                                  {(line.home_points ?? 0).toFixed(1)}
                                </p>
                                <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] mt-1">
                                  proj. {line.home_projected.toFixed(1)}
                                </p>
                              </div>
                              <div className="text-center px-4">
                                <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase">O/U {line.over_under}</p>
                                <p className="font-mono text-sm font-bold mt-1">
                                  {((line.home_points ?? 0) + (line.away_points ?? 0)).toFixed(1)}
                                </p>
                                <p className="font-mono text-[10px] uppercase text-[rgba(32,32,15,0.5)] mt-1">
                                  {result.overUnder === "push" ? "Push" : result.overUnder}
                                </p>
                              </div>
                              <div className="flex-1 min-w-[140px] text-right">
                                <p
                                  className={`font-body font-bold ${
                                    result.moneyline === "away" ? "text-[var(--color-gold)]" : ""
                                  }`}
                                >
                                  {awayName}
                                  {result.moneyline === "away" ? " ✓" : ""}
                                </p>
                                <p className="font-mono text-lg font-bold mt-1">
                                  {(line.away_points ?? 0).toFixed(1)}
                                </p>
                                <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] mt-1">
                                  proj. {line.away_projected.toFixed(1)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-dashed border-[rgba(32,32,15,0.15)] flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-[rgba(32,32,15,0.6)]">
                              <span>
                                ML:{" "}
                                {result.moneyline === "tie"
                                  ? "Tie"
                                  : `${result.moneyline === "home" ? homeName : awayName} won`}
                              </span>
                              <span>
                                Spread ({formatSpread(line.spread)}):{" "}
                                {result.spread === "push"
                                  ? "Push"
                                  : `${result.spread === "home" ? homeName : awayName} covered`}
                              </span>
                              <span>
                                O/U ({line.over_under}):{" "}
                                {result.overUnder === "push"
                                  ? "Push"
                                  : result.overUnder === "over"
                                  ? "Over hit"
                                  : "Under hit"}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Not played yet -- original pregame odds display.
                      return (
                        <div key={line.matchup_id} className="panel p-5">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-[140px]">
                              <p className="font-body font-bold">{homeName}</p>
                              <p className="font-mono text-sm mt-1">{line.home_projected.toFixed(1)} proj.</p>
                              <p className="font-mono text-sm mt-2">
                                <span className="text-[var(--color-gold)] font-bold">{formatSpread(line.spread)}</span>
                                <span className="text-[rgba(32,32,15,0.5)]"> · ML {formatOdds(line.home_moneyline)}</span>
                              </p>
                            </div>
                            <div className="text-center px-4">
                              <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase">O/U</p>
                              <p className="font-body">{line.over_under}</p>
                            </div>
                            <div className="flex-1 min-w-[140px] text-right">
                              <p className="font-body font-bold">{awayName}</p>
                              <p className="font-mono text-sm mt-1">{line.away_projected.toFixed(1)} proj.</p>
                              <p className="font-mono text-sm mt-2">
                                <span className="text-[rgba(32,32,15,0.5)]">ML {formatOdds(line.away_moneyline)} · </span>
                                <span className="text-[var(--color-gold)] font-bold">{formatSpread(-line.spread)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
