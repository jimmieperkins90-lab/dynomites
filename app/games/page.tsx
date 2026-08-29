import Link from "next/link";
import { getSeasonYears, getGamesForSeason, type GameResult } from "@/lib/queries";

export const dynamic = "force-dynamic";

function ScoreLine({ game }: { game: GameResult }) {
  const played = game.game_played && game.home_points != null && game.away_points != null;
  const homeWon = played && (game.home_points ?? 0) > (game.away_points ?? 0);
  const awayWon = played && (game.away_points ?? 0) > (game.home_points ?? 0);
  const hasOpponent = !!game.away_team_season_id;

  const hasProjection =
    !played &&
    hasOpponent &&
    game.home_projected_points != null &&
    game.away_projected_points != null;

  const homeDisplay = played
    ? game.home_points != null
      ? game.home_points.toFixed(1)
      : "—"
    : hasProjection
    ? Number(game.home_projected_points).toFixed(1)
    : "—";

  const awayDisplay = !hasOpponent
    ? "BYE"
    : played
    ? game.away_points != null
      ? game.away_points.toFixed(1)
      : "—"
    : hasProjection
    ? Number(game.away_projected_points).toFixed(1)
    : "—";

  const row = (
    <div className="panel px-5 py-4 flex items-center justify-between gap-4 hover:border-[var(--color-gold)] transition-colors">
      <div className="flex-1 min-w-0">
        <p className={`font-body truncate ${homeWon ? "text-[var(--color-gold)] font-bold" : ""}`}>
          {game.home_team_name ?? game.home_manager_name}
        </p>
        <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] truncate">{game.home_manager_name}</p>
      </div>
      <div className="font-mono text-lg shrink-0 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className={homeWon ? "text-[var(--color-gold)] font-bold" : ""}>{homeDisplay}</span>
          <span className="text-[rgba(32,32,15,0.3)]">-</span>
          <span className={awayWon ? "text-[var(--color-gold)] font-bold" : ""}>{awayDisplay}</span>
        </div>
        {hasProjection && (
          <span className="font-mono text-[10px] text-[rgba(32,32,15,0.4)] uppercase tracking-widest">
            Projected
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 text-right">
        {hasOpponent ? (
          <>
            <p className={`font-body truncate ${awayWon ? "text-[var(--color-gold)] font-bold" : ""}`}>
              {game.away_team_name ?? game.away_manager_name}
            </p>
            <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] truncate">{game.away_manager_name}</p>
          </>
        ) : (
          <p className="font-body text-[rgba(32,32,15,0.4)]">No opponent</p>
        )}
      </div>
    </div>
  );

  if (!hasOpponent) return row;

  return (
    <Link href={`/games/${game.home_matchup_id}`} className="block">
      {row}
    </Link>
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

  const games = await getGamesForSeason(activeYear);
  const byWeek = new Map<number, GameResult[]>();
  for (const game of games) {
    const list = byWeek.get(game.week) ?? [];
    list.push(game);
    byWeek.set(game.week, list);
  }
  const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="outline font-display text-4xl tracking-wide">Games</h1>
        <div className="flex gap-2">
          {years.map((year) => (
            <Link
              key={year}
              href={`/games?season=${year}`}
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

      {weeks.length === 0 ? (
        <p className="font-body opacity-60">No games found for {activeYear}.</p>
      ) : (
        <div className="space-y-10">
          {weeks.map((week) => {
            const weekGames = byWeek.get(week)!;
            const isPlayoff = weekGames.some((g) => g.is_playoff);
            return (
              <section key={week}>
                <h2 className="font-display text-xl text-[var(--color-rust)] mb-3 tracking-wide">
                  Week {week}
                  {isPlayoff && (
                    <span className="ml-3 font-mono text-xs text-[var(--color-gold)] align-middle">
                      {weekGames.find((g) => g.round_game)?.round_game ?? "Playoffs"}
                    </span>
                  )}
                </h2>
                <div className="space-y-3">
                  {weekGames.map((game) => (
                    <ScoreLine key={game.home_matchup_id} game={game} />
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
