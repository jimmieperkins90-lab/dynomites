import Link from "next/link";
import { getAllPlayerPerformances } from "@/lib/queries";

export const dynamic = "force-dynamic";

const POSITIONS = ["QB", "RB", "WR", "TE", "DEF", "K"];
const TOP_PER_POSITION = 5;
const TOP_OVERALL = 10;

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string; includeBench?: string }>;
}) {
  const params = await searchParams;
  const activePosition = params.position?.toUpperCase() ?? null;
  const includeBench = params.includeBench === "1";

  const all = await getAllPlayerPerformances();

  const pool = all.filter((p) => {
    if (!includeBench && !p.started) return false;
    if (activePosition && (p.position ?? "").toUpperCase() !== activePosition) return false;
    return true;
  });

  const top = [...pool].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, TOP_OVERALL);

  const topByPosition = POSITIONS.map((pos) => {
    const candidates = all.filter((p) => p.started && (p.position ?? "").toUpperCase() === pos);
    const best = [...candidates]
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, TOP_PER_POSITION);
    return { pos, best };
  }).filter((x) => x.best.length > 0);

  const filterLink = (overrides: { position?: string | null; includeBench?: boolean }) => {
    const p = new URLSearchParams();
    const pos = overrides.position !== undefined ? overrides.position : activePosition;
    const bench = overrides.includeBench !== undefined ? overrides.includeBench : includeBench;
    if (pos) p.set("position", pos);
    if (bench) p.set("includeBench", "1");
    const qs = p.toString();
    return qs ? `/players?${qs}` : "/players";
  };

  const chipClass = (active: boolean) =>
    `font-mono text-sm px-3 py-1.5 border rounded ${
      active
        ? "bg-[var(--color-gold)] text-[var(--color-ink)] border-[var(--color-gold)] font-bold"
        : "border-[rgba(32,32,15,0.3)] text-[rgba(32,32,15,0.65)] hover:border-[var(--color-gold)]"
    }`;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-4xl tracking-wide mb-8">Best Performances</h1>

      <section className="mb-12">
        <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">
          Top {TOP_PER_POSITION} by Position
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {topByPosition.map(({ pos, best }) => (
            <div key={pos} className="panel p-4">
              <p className="font-mono text-xs text-[rgba(32,32,15,0.5)] uppercase tracking-widest mb-3">
                {pos}
              </p>
              <ol className="space-y-2">
                {best.map((p, i) => (
                  <li key={`${p.matchup_id}-${p.sleeper_player_id}-${i}`} className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-[rgba(32,32,15,0.4)] w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-display text-lg text-[var(--color-gold)] w-16 shrink-0">
                      {p.points != null ? p.points.toFixed(1) : "—"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-body block truncate">{p.player_name ?? "Unknown"}</span>
                      <span className="font-mono text-[10px] text-[rgba(32,32,15,0.5)] block truncate">
                        {p.manager_name} · {p.season_year} Wk {p.week}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display text-xl text-[var(--color-rust)] tracking-wide">
            Top {TOP_OVERALL} All-Time
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Link href={filterLink({ position: null })} className={chipClass(!activePosition)}>
              All
            </Link>
            {POSITIONS.map((pos) => (
              <Link key={pos} href={filterLink({ position: pos })} className={chipClass(activePosition === pos)}>
                {pos}
              </Link>
            ))}
            <Link href={filterLink({ includeBench: !includeBench })} className={chipClass(includeBench)}>
              {includeBench ? "Starters + Bench" : "Starters Only"}
            </Link>
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">Player</th>
                <th className="px-4 py-3 font-normal">Pos</th>
                <th className="px-4 py-3 font-normal text-right">Points</th>
                <th className="px-4 py-3 font-normal">Manager</th>
                <th className="px-4 py-3 font-normal">Game</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p, i) => (
                <tr key={`${p.matchup_id}-${p.sleeper_player_id}-${i}`} className="border-t border-[rgba(32,32,15,0.12)]">
                  <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.55)]">{i + 1}</td>
                  <td className="px-4 py-2.5 font-body">
                    {p.player_name ?? "Unknown"}
                    {!p.started && (
                      <span className="ml-2 font-mono text-[10px] text-[rgba(32,32,15,0.4)] uppercase">
                        Bench
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.6)]">{p.position ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-right text-[var(--color-gold)] font-bold">
                    {p.points != null ? p.points.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-body text-[rgba(32,32,15,0.8)]">{p.manager_name}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/games/${p.game_id}`} className="font-mono text-xs text-[rgba(32,32,15,0.5)] hover:text-[var(--color-rust)]">
                      {p.season_year} Wk {p.week} vs {p.opponent_manager_name ?? "—"}
                    </Link>
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
