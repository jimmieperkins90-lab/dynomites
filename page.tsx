import Link from "next/link";
import {
  getSeasonYears,
  getGamesForSeason,
  getStartersForMatchupIds,
  type GameResult,
  type LineupRow,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function StarterList({ title, starters }: { title: string; starters: LineupRow[] }) {
  return (
    <div>
      <p className="font-mono text-xs text-olive uppercase tracking-widest mb-2">{title}</p>
      <table className="w-full text-sm">
        <tbody>
          {starters.length === 0 ? (
            <tr>
              <td className="py-1.5 font-body text-bone/40">No lineup data</td>
            </tr>
          ) : (
            starters.map((p) => (
              <tr key={p.id} className="border-t border-olive/10">
                <td className="py-1.5 font-mono text-xs text-olive w-10">{p.position ?? "—"}</td>
                <td className="py-1.5 font-body text-bone">{p.player_name ?? "Unknown"}</td>
                <td className="py-1.5 font-mono text-right text-bone">
                  {p.points != null ? p.points.toFixed(1) : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function GameRow({
  game,
  homeStarters,
  awayStarters,
}: {
  game: GameResult;
  homeStarters: LineupRow[];
  awayStarters: LineupRow[];
}) {
  const played = game.game_played && game.home_points != null && game.away_points != null;
  const homeWon = played && (game.home_points ?? 0) > (game.away_points ?? 0);
  const awayWon = played && (game.away_points ?? 0) > (game.home_points ?? 0);
  const hasOpponent = !!game.away_team_season_id;

  return (
    <details className="fossil-card bg-basalt border border-olive/30 hover:border-amber/60 transition-colors">
      <summary className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex-1 min-w-0">
          <p className={`font-body truncate ${homeWon ? "text-amber" : "text-bone"}`}>
            {game.home_team_name ?? game.home_manager_name}
          </p>
          <p className="font-mono text-xs text-bone/50 truncate">{game.home_manager_name}</p>
        </div>
        <div className="font-mono text-lg text-bone shrink-0 flex items-center gap-2">
          <span className={homeWon ? "text-amber" : ""}>
            {game.home_points != null ? game.home_points.toFixed(1) : "—"}
          </span>
          <span className="text-bone/30">-</span>
          <span className={awayWon ? "text-amber" : ""}>
            {hasOpponent ? (game.away_points != null ? game.away_points.toFixed(1) : "—") : "BYE"}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-right">
          {hasOpponent ? (
            <>
              <p className={`font-body truncate ${awayWon ? "text-amber" : "text-bone"}`}>
                {game.away_team_name ?? game.away_manager_name}
              </p>
              <p className="font-mono text-xs text-bone/50 truncate">{game.away_manager_name}</p>
            </>
          ) : (
            <p className="font-body text-bone/40">No opponent</p>
          )}
        </div>
      </summary>

      <div className="px-5 pb-5 pt-3 border-t border-olive/20">
        <div className={hasOpponent ? "grid sm:grid-cols-2 gap-6" : ""}>
          <StarterList title={game.home_manager_name} starters={homeStarters} />
          {hasOpponent && <StarterList title={game.away_manager_name!} starters={awayStarters} />}
        </div>
        {hasOpponent && (
          <Link
            href={`/games/${game.home_matchup_id}`}
            className="inline-block mt-4 font-mono text-xs text-amber hover:underline"
          >
            Full box score (with bench) →
          </Link>
        )}
      </div>
    </details>
  );
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const years = await getSeasonYears();
  if (years.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="font-body text-bone/70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const requestedYear = params.season ? parseInt(params.season, 10) : undefined;
  const activeYear = years.includes(requestedYear ?? -1) ? (requestedYear as number) : years[0];

  const games = await getGamesForSeason(activeYear);
  const matchupIds = games.flatMap((g) =>
    [g.home_matchup_id, g.away_matchup_id].filter((id): id is string => !!id)
  );
  const startersByMatchup = await getStartersForMatchupIds(matchupIds);

  const byWeek = new Map<number, GameResult[]>();
  for (const game of games) {
    const list = byWeek.get(game.week) ?? [];
    list.push(game);
    byWeek.set(game.week, list);
  }
  const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-display text-4xl text-bone tracking-wide">Games</h1>
        <div className="flex gap-2">
          {years.map((year) => (
            <Link
              key={year}
              href={`/games?season=${year}`}
              className={`font-mono text-sm px-3 py-1.5 border rounded ${
                year === activeYear
                  ? "bg-amber text-basalt border-amber"
                  : "border-olive/40 text-bone/70 hover:border-amber/60"
              }`}
            >
              {year}
            </Link>
          ))}
        </div>
      </div>

      {weeks.length === 0 ? (
        <p className="font-body text-bone/60">No games found for {activeYear}.</p>
      ) : (
        <div className="space-y-10">
          {weeks.map((week) => {
            const weekGames = byWeek.get(week)!;
            const isPlayoff = weekGames.some((g) => g.is_playoff);
            return (
              <section key={week}>
                <h2 className="font-display text-xl text-olive mb-3 tracking-wide">
                  Week {week}
                  {isPlayoff && (
                    <span className="ml-3 font-mono text-xs text-fuse align-middle">
                      {weekGames.find((g) => g.round_game)?.round_game ?? "Playoffs"}
                    </span>
                  )}
                </h2>
                <div className="space-y-3">
                  {weekGames.map((game) => (
                    <GameRow
                      key={game.home_matchup_id}
                      game={game}
                      homeStarters={startersByMatchup[game.home_matchup_id] ?? []}
                      awayStarters={
                        game.away_matchup_id ? startersByMatchup[game.away_matchup_id] ?? [] : []
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
