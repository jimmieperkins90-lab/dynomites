import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameById, getLineupsForMatchup, type LineupRow } from "@/lib/queries";

export const dynamic = "force-dynamic";

function LineupTable({
  starters,
  bench,
  teamPoints,
}: {
  starters: LineupRow[];
  bench: LineupRow[];
  teamPoints: number | null;
}) {
  return (
    <div className="panel p-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
            <th className="pb-2 font-normal">Pos</th>
            <th className="pb-2 font-normal">Player</th>
            <th className="pb-2 font-normal text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {starters.map((player) => (
            <tr key={player.id} className="border-t border-[rgba(32,32,15,0.12)]">
              <td className="py-1.5 font-mono text-xs text-[var(--color-rust)]">{player.position ?? "—"}</td>
              <td className="py-1.5 font-body">{player.player_name ?? "Unknown"}</td>
              <td className="py-1.5 font-mono text-right">
                {player.points != null ? player.points.toFixed(1) : "—"}
              </td>
            </tr>
          ))}
          <tr className="border-t border-[var(--color-gold)]">
            <td colSpan={2} className="py-2 font-display text-[var(--color-gold)] tracking-wide">
              Total
            </td>
            <td className="py-2 font-mono text-right text-[var(--color-gold)]">
              {teamPoints != null ? teamPoints.toFixed(1) : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {bench.length > 0 && (
        <details className="mt-4">
          <summary className="font-mono text-xs text-[rgba(32,32,15,0.5)] cursor-pointer hover:text-[rgba(32,32,15,0.8)]">
            Bench ({bench.length})
          </summary>
          <table className="w-full text-sm mt-2">
            <tbody>
              {bench.map((player) => (
                <tr key={player.id} className="border-t border-[rgba(32,32,15,0.12)]">
                  <td className="py-1.5 font-mono text-xs text-[rgba(32,32,15,0.4)] w-12">
                    {player.position ?? "—"}
                  </td>
                  <td className="py-1.5 font-body text-[rgba(32,32,15,0.6)]">
                    {player.player_name ?? "Unknown"}
                  </td>
                  <td className="py-1.5 font-mono text-right text-[rgba(32,32,15,0.6)]">
                    {player.points != null ? player.points.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

export default async function BoxScorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game || !game.away_matchup_id) {
    notFound();
  }

  const [home, away] = await Promise.all([
    getLineupsForMatchup(game.home_matchup_id),
    getLineupsForMatchup(game.away_matchup_id),
  ]);

  const homeWon = (game.home_points ?? 0) > (game.away_points ?? 0);
  const awayWon = (game.away_points ?? 0) > (game.home_points ?? 0);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href={`/games?season=${game.season_year}`}
        className="font-mono text-xs text-[rgba(32,32,15,0.5)] hover:text-[var(--color-gold)]"
      >
        ← Back to Week {game.week}
      </Link>

      <div className="mt-4 mb-8 text-center">
        {game.is_playoff && (
          <p className="font-mono text-xs text-[var(--color-gold)] mb-2 uppercase tracking-widest">
            {game.round_game ?? "Playoffs"}
          </p>
        )}
        <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] mb-2">
          {game.season_year} · Week {game.week}
        </p>
        <div className="flex items-center justify-center gap-6">
          <div className="text-right flex-1">
            <p
              className={`font-display text-2xl tracking-wide ${
                homeWon ? "text-[var(--color-gold)]" : ""
              }`}
            >
              {game.home_team_name ?? game.home_manager_name}
            </p>
            <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{game.home_manager_name}</p>
          </div>
          <div className="font-mono text-3xl shrink-0">
            {game.home_points?.toFixed(1) ?? "—"}
            <span className="text-[rgba(32,32,15,0.3)] mx-2">-</span>
            {game.away_points?.toFixed(1) ?? "—"}
          </div>
          <div className="text-left flex-1">
            <p
              className={`font-display text-2xl tracking-wide ${
                awayWon ? "text-[var(--color-gold)]" : ""
              }`}
            >
              {game.away_team_name ?? game.away_manager_name}
            </p>
            <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{game.away_manager_name}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <LineupTable starters={home.starters} bench={home.bench} teamPoints={game.home_points} />
        <LineupTable starters={away.starters} bench={away.bench} teamPoints={game.away_points} />
      </div>
    </main>
  );
}
