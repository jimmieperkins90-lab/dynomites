import Link from "next/link";
import { getSeasonYears, getProjectedLines, getProjectedWinTotals } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatOdds(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
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

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
        <h1 className="outline font-display text-4xl tracking-wide">Betting Lines</h1>
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
        sportsbook. Only games with a synced projection are shown, so this typically covers the next
        unplayed week rather than the full remaining schedule.
      </p>

      <section className="mb-12">
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">This Week&apos;s Lines</h2>
        {lines.length === 0 ? (
          <p className="font-body opacity-60">No projected games available right now.</p>
        ) : (
          <div className="space-y-4">
            {lines.map((line) => (
              <div key={line.matchup_id} className="panel p-5">
                <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase tracking-widest mb-3">
                  Week {line.week}
                </p>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-body font-bold">{line.home_team_name ?? line.home_manager_name}</p>
                    <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{line.home_manager_name}</p>
                    <p className="font-mono text-sm mt-1">{line.home_projected.toFixed(1)} proj.</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase">Spread</p>
                    <p className="font-display text-lg text-[var(--color-gold)]">
                      {line.spread === 0
                        ? "PK"
                        : line.spread > 0
                        ? `Home -${line.spread}`
                        : `Away -${Math.abs(line.spread)}`}
                    </p>
                    <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] mt-2 uppercase">O/U</p>
                    <p className="font-body">{line.over_under}</p>
                  </div>
                  <div className="flex-1 min-w-[140px] text-right">
                    <p className="font-body font-bold">{line.away_team_name ?? line.away_manager_name}</p>
                    <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{line.away_manager_name}</p>
                    <p className="font-mono text-sm mt-1">{line.away_projected.toFixed(1)} proj.</p>
                  </div>
                </div>
                <div className="flex justify-between mt-4 pt-4 border-t border-[rgba(32,32,15,0.12)] font-mono text-sm">
                  <span>ML {formatOdds(line.home_moneyline)}</span>
                  <span className="text-[rgba(32,32,15,0.5)]">
                    {(line.home_win_prob * 100).toFixed(0)}% / {((1 - line.home_win_prob) * 100).toFixed(0)}%
                  </span>
                  <span>ML {formatOdds(line.away_moneyline)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Projected Win Totals</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">Manager</th>
                <th className="px-4 py-3 font-normal text-right">Current W-L</th>
                <th className="px-4 py-3 font-normal text-right">+Proj.</th>
                <th className="px-4 py-3 font-normal text-right">Proj. Total</th>
              </tr>
            </thead>
            <tbody>
              {winTotals.map((row) => (
                <tr key={row.team_season_id} className="border-t border-[rgba(32,32,15,0.12)]">
                  <td className="px-4 py-2.5 font-body">{row.manager_name}</td>
                  <td className="px-4 py-2.5 font-mono text-right">
                    {row.wins}-{row.losses}
                    {row.ties > 0 ? `-${row.ties}` : ""}
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
    </main>
  );
}
