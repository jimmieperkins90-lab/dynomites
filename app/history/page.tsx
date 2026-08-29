import Link from "next/link";
import {
  getCareerStats,
  getAllTeamGameScores,
  getAllPlayedGames,
  buildHeadToHead,
  getDivisionTitleCountsByManager,
  getCanonicalMatchupIdMap,
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
  gameId,
}: {
  title: string;
  points: number | null;
  manager: string;
  team: string | null;
  opponentPoints?: number | null;
  opponentManager?: string | null;
  season: number;
  week: number;
  gameId: string | null;
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
  return gameId ? <Link href={`/games/${gameId}`}>{content}</Link> : content;
}

// Used for blowout/nailbiter -- leads with the margin of victory (what
// actually makes those two records notable) instead of just one team's raw
// score, and always shows both teams' scores side by side.
function MarginRecordCard({
  title,
  winnerManager,
  winnerTeam,
  winnerPoints,
  loserManager,
  loserTeam,
  loserPoints,
  season,
  week,
  gameId,
}: {
  title: string;
  winnerManager: string;
  winnerTeam: string | null;
  winnerPoints: number;
  loserManager: string;
  loserTeam: string | null;
  loserPoints: number;
  season: number;
  week: number;
  gameId: string;
}) {
  const margin = Math.abs(winnerPoints - loserPoints);
  return (
    <Link href={`/games/${gameId}`}>
      <div className="panel p-5 hover:border-[var(--color-gold)] transition-colors h-full">
        <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase tracking-widest mb-2">{title}</p>
        <p className="font-display text-3xl text-[var(--color-gold)]">Won by {margin.toFixed(1)}</p>
        <p className="font-body mt-2">
          {winnerTeam ?? winnerManager}{" "}
          <span className="font-mono text-sm text-[rgba(32,32,15,0.6)]">({winnerPoints.toFixed(1)})</span>
        </p>
        <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{winnerManager}</p>
        <p className="font-body mt-2 text-[rgba(32,32,15,0.7)]">
          def. {loserTeam ?? loserManager}{" "}
          <span className="font-mono text-sm">({loserPoints.toFixed(1)})</span>
        </p>
        <p className="font-mono text-xs text-[rgba(32,32,15,0.4)] mt-2">
          {season} Wk {week}
        </p>
      </div>
    </Link>
  );
}

export default async function HistoryPage() {
  const [careerStats, teamScores, playedGames, divisionTitles, canonicalIds] = await Promise.all([
    getCareerStats(),
    getAllTeamGameScores(),
    getAllPlayedGames(),
    getDivisionTitleCountsByManager(),
    getCanonicalMatchupIdMap(),
  ]);

  const { summary: h2h, games: h2hGames } = buildHeadToHead(teamScores, canonicalIds);
  const managers = Array.from(new Set(teamScores.map((r) => r.manager_name))).sort();

  const scored = teamScores.filter((r) => r.points != null);
  const highest = [...scored].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
  const lowest = [...scored].sort((a, b) => (a.points ?? 0) - (b.points ?? 0))[0];

  const withMargin = playedGames
    .filter(
      (g): g is GameResult & { home_points: number; away_points: number } =>
        g.home_points != null && g.away_points != null
    )
    .map((g) => ({ ...g, margin: Math.abs(g.home_points - g.away_points) }));

  const blowout = [...withMargin].sort((a, b) => b.margin - a.margin)[0];
  const nailbiter = [...withMargin].filter((g) => g.margin > 0).sort((a, b) => a.margin - b.margin)[0];

  function toWinnerLoser(game: (typeof withMargin)[number]) {
    const homeWon = game.home_points > game.away_points;
    return homeWon
      ? {
          winnerManager: game.home_manager_name,
          winnerTeam: game.home_team_name,
          winnerPoints: game.home_points,
          loserManager: game.away_manager_name ?? "Unknown",
          loserTeam: game.away_team_name,
          loserPoints: game.away_points,
        }
      : {
          winnerManager: game.away_manager_name ?? "Unknown",
          winnerTeam: game.away_team_name,
          winnerPoints: game.away_points,
          loserManager: game.home_manager_name,
          loserTeam: game.home_team_name,
          loserPoints: game.home_points,
        };
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-4xl tracking-wide mb-8">History &amp; Records</h1>

      <section className="mb-12">
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">Career Standings</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">Manager</th>
                <th className="px-4 py-3 font-normal text-right">W</th>
                <th className="px-4 py-3 font-normal text-right">L</th>
                <th className="px-4 py-3 font-normal text-right">Win%</th>
                <th className="px-4 py-3 font-normal text-right">PF</th>
                <th className="px-4 py-3 font-normal text-right">PA</th>
                <th className="px-4 py-3 font-normal text-right">Playoffs</th>
                <th className="px-4 py-3 font-normal text-right">Div. Titles</th>
                <th className="px-4 py-3 font-normal text-right">Titles</th>
              </tr>
            </thead>
            <tbody>
              {careerStats.map((m) => {
                const games = m.total_wins + m.total_losses + m.total_ties;
                const winPct = games > 0 ? (m.total_wins + m.total_ties * 0.5) / games : 0;
                const divTitles = divisionTitles[m.manager_name] ?? 0;
                return (
                  <tr key={m.manager_id} className="border-t border-[rgba(32,32,15,0.12)]">
                    <td className="px-4 py-2.5 font-body">{m.manager_name}</td>
                    <td className="px-4 py-2.5 font-mono text-right">{m.total_wins}</td>
                    <td className="px-4 py-2.5 font-mono text-right">{m.total_losses}</td>
                    <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                      {(winPct * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right">{fmt(m.total_points_for)}</td>
                    <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                      {fmt(m.total_points_against)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.7)]">
                      {m.playoff_appearances}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right">
                      {divTitles > 0 ? (
                        <span className="text-[var(--color-rust)] font-bold">{divTitles}</span>
                      ) : (
                        <span className="text-[rgba(32,32,15,0.3)]">0</span>
                      )}
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
              gameId={canonicalIds.get(highest.matchup_id) ?? highest.matchup_id}
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
              gameId={canonicalIds.get(lowest.matchup_id) ?? lowest.matchup_id}
            />
          )}
          {blowout && (
            <MarginRecordCard
              title="Biggest Blowout"
              {...toWinnerLoser(blowout)}
              season={blowout.season_year}
              week={blowout.week}
              gameId={blowout.home_matchup_id}
            />
          )}
          {nailbiter && (
            <MarginRecordCard
              title="Closest Game"
              {...toWinnerLoser(nailbiter)}
              season={nailbiter.season_year}
              week={nailbiter.week}
              gameId={nailbiter.home_matchup_id}
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
                <div className="mt-3 space-y-4">
                  {opponentNames.map((opp) => {
                    const rec = opponents[opp];
                    const games = h2hGames[manager]?.[opp] ?? [];
                    return (
                      <details key={opp} className="border-t border-[rgba(32,32,15,0.12)] pt-3">
                        <summary className="cursor-pointer flex items-center justify-between font-body text-[rgba(32,32,15,0.85)]">
                          <span>{opp}</span>
                          <span className="font-mono text-sm text-[rgba(32,32,15,0.6)]">
                            {rec.wins}-{rec.losses}
                            {rec.ties > 0 ? `-${rec.ties}` : ""}
                          </span>
                        </summary>
                        <table className="w-full text-sm mt-2 mb-1">
                          <tbody>
                            {games.map((g) => (
                              <tr key={g.game_id + g.week} className="border-t border-[rgba(32,32,15,0.08)]">
                                <td className="py-1.5 font-mono text-xs text-[rgba(32,32,15,0.5)]">
                                  {g.season_year} Wk {g.week}
                                </td>
                                <td className="py-1.5 font-mono text-right">
                                  {g.points.toFixed(1)} - {g.opponent_points.toFixed(1)}
                                </td>
                                <td className="py-1.5 pl-3 font-mono text-xs">
                                  <span
                                    className={
                                      g.result === "W"
                                        ? "text-[var(--color-gold)] font-bold"
                                        : "text-[rgba(32,32,15,0.5)]"
                                    }
                                  >
                                    {g.result}
                                  </span>
                                </td>
                                <td className="py-1.5 pl-3 text-right">
                                  <Link
                                    href={`/games/${g.game_id}`}
                                    className="font-mono text-xs text-[rgba(32,32,15,0.5)] hover:text-[var(--color-rust)] underline"
                                  >
                                    Lineups
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
