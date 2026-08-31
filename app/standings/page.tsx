import Link from "next/link";
import { getSeasonYears, getStandingsForSeason, type StandingsRow } from "@/lib/queries";

export const dynamic = "force-dynamic";

function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  return (
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
          {rows.map((team) => {
            const isChampion = team.final_rank === 1;
            return (
              <tr key={team.team_season_id} className="border-t border-[rgba(32,32,15,0.12)]">
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const years = await getSeasonYears();

  if (years.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="outline font-display text-4xl tracking-wide mb-4">Standings</h1>
        <p className="font-body opacity-70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const requestedYear = params.season ? parseInt(params.season, 10) : undefined;
  const activeYear = years.includes(requestedYear ?? -1) ? (requestedYear as number) : years[0];

  const standings = await getStandingsForSeason(activeYear);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="outline font-display text-4xl tracking-wide">Standings</h1>
        {years.length > 1 && (
          <div className="flex gap-2">
            {years.map((year) => (
              <Link
                key={year}
                href={`/standings?season=${year}`}
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
        )}
      </div>

      {standings.length === 0 ? (
        <p className="font-body opacity-60">No standings data for {activeYear} yet.</p>
      ) : (
        <StandingsTable rows={standings} />
      )}
    </main>
  );
}
