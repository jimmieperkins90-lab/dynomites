import Link from "next/link";
import { getSeasonYears, getStandingsForSeason, type StandingsRow } from "@/lib/queries";

export const dynamic = "force-dynamic";

function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  return (
    <div className="fossil-card bg-basalt border border-olive/30 overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-bone/50 font-mono text-xs uppercase">
            <th className="px-4 py-3 font-normal">#</th>
            <th className="px-4 py-3 font-normal">Team</th>
            <th className="px-4 py-3 font-normal text-right">W</th>
            <th className="px-4 py-3 font-normal text-right">L</th>
            <th className="px-4 py-3 font-normal text-right">T</th>
            <th className="px-4 py-3 font-normal text-right">PF</th>
            <th className="px-4 py-3 font-normal text-right">PA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team) => {
            const isChampion = team.final_rank === 1;
            return (
              <tr key={team.team_season_id} className="border-t border-olive/10">
                <td className="px-4 py-2.5 font-mono text-bone/60">
                  {team.final_rank ?? team.regular_season_rank ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <p className={`font-body ${isChampion ? "text-fuse" : "text-bone"}`}>
                    {isChampion && "🏆 "}
                    {team.team_name ?? team.manager_name}
                  </p>
                  <p className="font-mono text-xs text-bone/50">{team.manager_name}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-right text-bone">{team.wins}</td>
                <td className="px-4 py-2.5 font-mono text-right text-bone">{team.losses}</td>
                <td className="px-4 py-2.5 font-mono text-right text-bone/60">{team.ties}</td>
                <td className="px-4 py-2.5 font-mono text-right text-bone">
                  {team.points_for != null ? team.points_for.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-right text-bone/60">
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
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display text-4xl text-bone tracking-wide mb-4">Dyno Mites</h1>
        <p className="font-body text-bone/70">
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
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-display text-4xl text-bone tracking-wide">Standings</h1>
        {years.length > 1 && (
          <div className="flex gap-2">
            {years.map((year) => (
              <Link
                key={year}
                href={`/standings?season=${year}`}
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
        )}
      </div>

      {standings.length === 0 ? (
        <p className="font-body text-bone/60">No standings data for {activeYear} yet.</p>
      ) : (
        <StandingsTable rows={standings} />
      )}
    </main>
  );
}
