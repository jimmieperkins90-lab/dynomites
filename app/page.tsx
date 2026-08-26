import { getSupabase } from "@/lib/supabase";

// Always render at request time, never at build time -- this page depends on
// env vars and a live DB, neither of which should block a build.
export const dynamic = "force-dynamic";

type StandingsRow = {
  id: string;
  team_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  points_for: number | null;
  points_against: number | null;
  final_rank: number | null;
  made_playoffs: boolean;
  managers: { display_name: string } | null;
};

async function getCurrentSeasonStandings() {
  const supabase = getSupabase();
  if (!supabase) {
    return { season: null, standings: [] as StandingsRow[], configError: true };
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year")
    .order("year", { ascending: false })
    .limit(1)
    .single();

  if (!season) return { season: null, standings: [] as StandingsRow[] };

  const { data: standings } = await supabase
    .from("team_seasons")
    .select(
      "id, team_name, wins, losses, ties, points_for, points_against, final_rank, made_playoffs, managers(display_name)"
    )
    .eq("season_id", season.id)
    .order("wins", { ascending: false })
    .order("points_for", { ascending: false });

  return { season, standings: (standings ?? []) as unknown as StandingsRow[] };
}

export default async function HomePage() {
  const { season, standings, configError } = await getCurrentSeasonStandings();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="font-mono text-sm uppercase tracking-widest text-amber">
          Est. 2025
        </p>
        <h1 className="font-display text-6xl leading-none text-bone">
          Dyno Mites
        </h1>
        <p className="mt-2 font-body text-bone/70">
          League history, standings, and box scores.
        </p>
      </header>

      {configError ? (
        <div className="fossil-card bg-rust/10 p-8 text-bone">
          <p className="font-mono text-sm uppercase tracking-wide text-rust">
            Configuration needed
          </p>
          <p className="mt-2 text-bone/80">
            SUPABASE_URL and/or SUPABASE_ANON_KEY aren&apos;t set for this
            deployment. Check Vercel &rarr; Settings &rarr; Environment
            Variables, make sure Production is checked for each one, then
            redeploy.
          </p>
        </div>
      ) : !season ? (
        <div className="fossil-card bg-bone/5 p-8 text-bone/70">
          No season data yet -- visit <code className="font-mono">/api/sync?secret=...</code> to
          pull the first season in from Sleeper.
        </div>
      ) : (
        <section>
          <h2 className="mb-4 font-display text-3xl text-amber">
            {season.year} Standings
          </h2>
          <div className="fossil-card overflow-hidden bg-bone/5">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="font-mono text-xs uppercase tracking-wide text-bone/60">
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">W-L-T</th>
                  <th className="px-4 py-3">PF</th>
                  <th className="px-4 py-3">PA</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.final_rank === 1
                        ? "bg-fuse/10 font-medium text-fuse"
                        : "text-bone"
                    }
                  >
                    <td className="px-4 py-3">{row.team_name ?? "—"}</td>
                    <td className="px-4 py-3 text-bone/70">
                      {row.managers?.display_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.wins}-{row.losses}
                      {row.ties ? `-${row.ties}` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.points_for?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.points_against?.toFixed(1) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
