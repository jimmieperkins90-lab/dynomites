import Link from "next/link";
import {
  getCareerStats,
  getAllTeamGameScores,
  getAllPlayedGames,
  buildHeadToHead,
  type GameResult,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmt(n: number | null | undefined) {
  return n != null ? n.toFixed(1) : "—";
}

function RecordCard({
  title,
  points,
  manager,
  team,
  opponentPoints,
  opponentManager,
  season,
  week,
  matchupId,
}: {
  title: string;
  points: number | null;
  manager: string;
  team: string | null;
  opponentPoints?: number | null;
  opponentManager?: string | null;
  season: number;
  week: number;
  matchupId: string | null;
}) {
  const content = (
    <div className="panel p-5 hover:border-[var(--color-gold)] transition-colors h-full">
      <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase tracking-widest mb-2">{title}</p>
      <p className="font-display text-3xl text-[var(--color-gold)]">{fmt(points)}</p>
      <p className="font-body mt-1">{team ?? manager}</p>
      <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{manager}</p>
      {opponentManager && (
        <p className="font-mono text-xs text-[rgba(32,32,15,0.4)] mt-2">
          vs {opponentManager} ({fmt(opponentPoints)}) · {season} Wk {week}
        </p>
      )}
    </div>
  );
  return matchupId ? <Link href={`/games/${matchupId}`}>{content}</Link> : content;
}

export default async function HistoryPage() {
  const [careerStats, teamScores, playedGames] = await Promise.all([
    getCareerStats(),
    getAllTeamGameScores(),
    getAllPlayedGames(),
  ]);

  const h2h = buildHeadToHead(teamScores);
  const managers = Array.from(new Set(teamScores.map((r) => r.manager_name))).sort();

  const scored = teamScores.filter((r) => r.points != null);
  const highest = [...scored].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
  const lowest = [...scored].sort((a, b) => (a.points ?? 0) - (b.points ?? 0))[0];

  const withMargin = playedGames
    .filter((g): g is GameResult & { home_points: number; away_points: number } =>
      g.home_points != null && g.away_points != null
    )
    .map((g) => ({ ...g, margin: Math.abs(g.home_points - g.away_points) }));

  const blowout = [...withMargin].sort((a, b) => b.margin - a.margin)[0];
  const nailbiter = [...withMargin].sort((a, b) => a.margin - b.margin)[0];

  const blowoutWinner =
    blowout && blowout.home_points > blowout.away_points
      ? { manager: blowout.home_manager_name, team: blowout.home_team_name, pts: blowout.home_points, oppManager: blowout.away_manager_name, oppPts: blowout.away_points }
      : blowout
      ? { manager: blowout.away_manager_name!, team: blowout.away_team_name, pts: blowout.away_points, oppManager: blowout.home_manager_name, oppPts: blowout.home_points }
      : null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-4xl tracking-wide mb-8">History &amp; Records</h1>

      <section className="mb-12">
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Career Standings</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">Manager</th>
                <th className="px-4 py-3 font-normal text-right">W</th>
                <th className="px-4 py-3 font-normal text-right">L</th>
                <th className="px-4 py-3 font-normal text-right">Win%</th>
                <th className="px-4 py-3 font-normal text-right">PF</th>
                <th className="px-4 py-3 font-normal text-right">PA</th>
                <th className="px-4 py-3 font-normal text-right">Playoffs</th>
                <th className="px-4 py-3 font-normal text-right">Titles</th>
              </tr>
            </thead>
            <tbody>
              {careerStats.map((m) => {
                const games = m.total_wins + m.total_losses + m.total_ties;
                const winPct = games > 0 ? (m.total_wins + m.total_ties * 0.5) / games : 0;
                return (
                  <tr key={m.manager_id} className="border-t border-[rgba(32,32,15,0.12)]">
                    <td className="px-4 py-2.5 font-body">{m.manager_name}</td>
                    <td className="px-4 py-2.5 font-mono text-right">{m.total_wins}</td>
                    <td className="px-4 py-2.5 font-mono text-right">{m.total_losses}</td>
                    <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                      {(winPct * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right">
                      {fmt(m.total_points_for)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                      {fmt(m.total_points_against)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                      {m.playoff_appearances}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right">
                      {m.championships > 0 ? (
                        <span className="text-[var(--color-gold)] font-bold">{m.championships}</span>
                      ) : (
                        <span className="text-[rgba(32,32,15,0.3)]">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Notable Games</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {highest && (
            <RecordCard
              title="Highest Score"
              points={highest.points}
              manager={highest.manager_name}
              team={highest.team_name}
              opponentPoints={highest.opponent_points}
              opponentManager={highest.opponent_manager_name}
              season={highest.season_year}
              week={highest.week}
              matchupId={highest.matchup_id}
            />
          )}
          {lowest && (
            <RecordCard
              title="Lowest Score"
              points={lowest.points}
              manager={lowest.manager_name}
              team={lowest.team_name}
              opponentPoints={lowest.opponent_points}
              opponentManager={lowest.opponent_manager_name}
              season={lowest.season_year}
              week={lowest.week}
              matchupId={lowest.matchup_id}
            />
          )}
          {blowoutWinner && blowout && (
            <RecordCard
              title="Biggest Blowout"
              points={blowoutWinner.pts}
              manager={blowoutWinner.manager}
              team={blowoutWinner.team}
              opponentPoints={blowoutWinner.oppPts}
              opponentManager={blowoutWinner.oppManager}
              season={blowout.season_year}
              week={blowout.week}
              matchupId={blowout.home_matchup_id}
            />
          )}
          {nailbiter && (
            <RecordCard
              title="Closest Game"
              points={nailbiter.home_points}
              manager={nailbiter.home_manager_name}
              team={nailbiter.home_team_name}
              opponentPoints={nailbiter.away_points}
              opponentManager={nailbiter.away_manager_name}
              season={nailbiter.season_year}
              week={nailbiter.week}
              matchupId={nailbiter.home_matchup_id}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Head-to-Head</h2>
        <div className="space-y-2">
          {managers.map((manager) => {
            const opponents = h2h[manager] ?? {};
            const opponentNames = Object.keys(opponents).sort();
            if (opponentNames.length === 0) return null;
            return (
              <details key={manager} className="panel px-5 py-3">
                <summary className="font-body cursor-pointer">{manager}</summary>
                <table className="w-full text-sm mt-3">
                  <tbody>
                    {opponentNames.map((opp) => {
                      const rec = opponents[opp];
                      return (
                        <tr key={opp} className="border-t border-[rgba(32,32,15,0.12)]">
                          <td className="py-1.5 font-body text-[rgba(32,32,15,0.8)]">{opp}</td>
                          <td className="py-1.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                            {rec.wins}-{rec.losses}
                            {rec.ties > 0 ? `-${rec.ties}` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
