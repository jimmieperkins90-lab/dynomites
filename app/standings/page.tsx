import Link from "next/link";
import {
  getSeasonYears,
  getStandingsForSeason,
  getGamesForSeason,
  getPlayoffBracket,
  type StandingsRow,
  type GameResult,
  type PlayoffRound,
} from "@/lib/queries";
import { TeamStandingsRow } from "@/components/TeamStandingsRow";

export const dynamic = "force-dynamic";

function fmt(n: number | null | undefined) {
  return n != null ? n.toFixed(1) : "—";
}

function pillClass(active: boolean) {
  return `font-mono text-sm px-3 py-1.5 border rounded ${
    active
      ? "bg-[var(--color-gold)] text-[var(--color-ink)] border-[var(--color-gold)] font-bold"
      : "border-[rgba(32,32,15,0.3)] text-[rgba(32,32,15,0.65)] hover:border-[var(--color-gold)]"
  }`;
}

function BracketGameCard({ game }: { game: GameResult }) {
  const homeWon = (game.home_points ?? 0) > (game.away_points ?? 0);
  return (
    <Link href={`/games/${game.home_matchup_id}`}>
      <div className="panel px-4 py-3 hover:border-[var(--color-gold)] transition-colors">
        <p className={`font-body text-sm ${homeWon ? "text-[var(--color-gold)] font-bold" : ""}`}>
          {game.home_team_name ?? game.home_manager_name}{" "}
          <span className="font-mono">{fmt(game.home_points)}</span>
        </p>
        <p className={`font-body text-sm ${!homeWon ? "text-[var(--color-gold)] font-bold" : ""}`}>
          {game.away_team_name ?? game.away_manager_name}{" "}
          <span className="font-mono">{fmt(game.away_points)}</span>
        </p>
      </div>
    </Link>
  );
}

function groupRoundsByWeek(rounds: PlayoffRound[]): { week: number; groups: PlayoffRound[] }[] {
  const byWeek = new Map<number, PlayoffRound[]>();
  for (const r of rounds) {
    const week = r.games[0]?.week ?? 0;
    (byWeek.get(week) ?? byWeek.set(week, []).get(week)!).push(r);
  }
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, groups]) => ({
      week,
      groups: [...groups].sort((a, b) => {
        const aPlacement = /place/i.test(a.round);
        const bPlacement = /place/i.test(b.round);
        if (aPlacement !== bPlacement) return aPlacement ? 1 : -1;
        return a.round.localeCompare(b.round);
      }),
    }));
}

function BracketColumn({ title, rounds }: { title: string; rounds: PlayoffRound[] }) {
  if (rounds.length === 0) {
    return (
      <div>
        <h3 className="font-display text-lg text-[var(--color-rust)] mb-3 tracking-wide">{title}</h3>
        <p className="font-body text-sm opacity-60">No games yet.</p>
      </div>
    );
  }
  const weekColumns = groupRoundsByWeek(rounds);
  return (
    <div>
      <h3 className="font-display text-lg text-[var(--color-rust)] mb-3 tracking-wide">{title}</h3>
      <div className="flex items-start gap-2 overflow-x-auto pb-2">
        {weekColumns.map(({ week, groups }, i) => {
          const roundNumber = i + 1;
          return (
            <div key={week} className="flex items-start gap-2 shrink-0">
              <div className="flex flex-col min-w-[168px] gap-5">
                {groups.map((g) => {
                  const isPlacement = /place/i.test(g.round);
                  const label = isPlacement ? g.round : `Round ${roundNumber}`;
                  return (
                    <div key={g.round}>
                      <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase tracking-widest mb-2 text-center">
                        {label}
                      </p>
                      <div className="flex flex-col gap-3">
                        {g.games.map((game) => (
                          <BracketGameCard key={game.home_matchup_id} game={game} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {i < weekColumns.length - 1 && (
                <span className="font-mono text-[rgba(32,32,15,0.3)] pt-8 select-none" aria-hidden="true">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; view?: string }>;
}) {
  const years = await getSeasonYears();

  if (years.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="font-display text-4xl tracking-wide mb-4">Seasons</h1>
        <p className="font-body opacity-70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const requestedYear = params.season ? parseInt(params.season, 10) : undefined;
  const activeYear = years.includes(requestedYear ?? -1) ? (requestedYear as number) : years[0];
  const activeView = params.view === "bracket" ? "bracket" : "standings";

  const yearSwitcher = (
    <div className="flex gap-2">
      {years.map((year) => (
        <Link
          key={year}
          href={`/standings?season=${year}${activeView === "bracket" ? "&view=bracket" : ""}`}
          className={pillClass(year === activeYear)}
        >
          {year}
        </Link>
      ))}
    </div>
  );

  // ---- Bracket view --------------------------------------------------
  if (activeView === "bracket") {
    const bracket = await getPlayoffBracket(activeYear);
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="font-display text-4xl tracking-wide">Seasons</h1>
          {yearSwitcher}
        </div>

        <Link href={`/standings?season=${activeYear}`} className="font-mono text-sm underline mb-8 inline-block">
          ← Back to standings
        </Link>

        {bracket.winners.length === 0 && bracket.losers.length === 0 ? (
          <p className="font-body opacity-60">No playoff games for {activeYear} yet.</p>
        ) : (
          <>
            <div className="space-y-10">
              <BracketColumn title="Championship Bracket" rounds={bracket.winners} />
              <BracketColumn title="Consolation Bracket" rounds={bracket.losers} />
            </div>
            {bracket.unplaced.length > 0 && (
              <p className="font-mono text-xs text-[rgba(32,32,15,0.4)] mt-6">
                {bracket.unplaced.length} playoff game{bracket.unplaced.length === 1 ? "" : "s"} couldn&apos;t be
                placed in a bracket (missing bracket data from the sync).
              </p>
            )}
          </>
        )}
      </main>
    );
  }

  // ---- Standings view (default) ---------------------------------------
  const [standings, games] = await Promise.all([
    getStandingsForSeason(activeYear),
    getGamesForSeason(activeYear),
  ]);

  const gamesByTeam = new Map<string, GameResult[]>();
  for (const g of games) {
    if (g.home_team_season_id) {
      (gamesByTeam.get(g.home_team_season_id) ?? gamesByTeam.set(g.home_team_season_id, []).get(g.home_team_season_id)!).push(g);
    }
    if (g.away_team_season_id) {
      (gamesByTeam.get(g.away_team_season_id) ?? gamesByTeam.set(g.away_team_season_id, []).get(g.away_team_season_id)!).push(g);
    }
  }
  for (const list of gamesByTeam.values()) {
    list.sort((a, b) => a.week - b.week);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="font-display text-4xl tracking-wide">Seasons</h1>
        {yearSwitcher}
      </div>

      <Link href={`/standings?season=${activeYear}&view=bracket`} className="font-mono text-sm underline mb-6 inline-block">
        View {activeYear} playoff bracket →
      </Link>

      {standings.length === 0 ? (
        <p className="font-body opacity-60">No standings data for {activeYear} yet.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">Team</th>
                <th className="px-4 py-3 font-normal text-right">W</th>
                <th className="px-4 py-3 font-normal text-right">L</th>
                <th className="px-4 py-3 font-normal text-right">PF</th>
                <th className="px-4 py-3 font-normal text-right">PA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team: StandingsRow) => (
                <TeamStandingsRow
                  key={team.team_season_id}
                  team={team}
                  games={gamesByTeam.get(team.team_season_id) ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
