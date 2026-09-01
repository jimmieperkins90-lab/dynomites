import { getDraftHistory, type DraftPick } from "@/lib/queries";
import { DraftFilters } from "@/components/DraftFilters";

export const dynamic = "force-dynamic";

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "DEF", "K"];

function formatLabel(pick: DraftPick): string | null {
  if (!pick.sleeper_draft_type) return null;
  const map: Record<string, string> = { auction: "Auction", snake: "Snake", linear: "Linear" };
  return map[pick.sleeper_draft_type] ?? pick.sleeper_draft_type;
}

function sectionTitle(pick: DraftPick): string {
  const base = pick.draft_type === "initial" ? "Initial Draft" : `${pick.season_year} Rookie Draft`;
  const format = formatLabel(pick);
  return format ? `${base} · ${format}` : base;
}

function teamLabel(pick: DraftPick): string | null {
  return pick.team_name ?? pick.manager_name ?? null;
}

export default async function DraftPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; round?: string; position?: string }>;
}) {
  const picks = await getDraftHistory();

  if (picks.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="outline font-display text-4xl tracking-wide mb-4">Draft History</h1>
        <p className="font-body opacity-70">
          No draft data synced yet. Run the Sleeper sync to pull the initial draft and rookie drafts.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const activeTeam = params.team ?? null;
  const activeRound = params.round ? parseInt(params.round, 10) : null;
  const activePosition = params.position?.toUpperCase() ?? null;

  // Filter option lists are built from the FULL unfiltered pick set, so
  // choosing one filter doesn't narrow the options available in the others.
  const allTeams = Array.from(new Set(picks.map(teamLabel).filter((t): t is string => !!t))).sort();
  const allRounds = Array.from(new Set(picks.map((p) => p.round))).sort((a, b) => a - b);
  const presentPositions = new Set(picks.map((p) => p.position).filter((p): p is string => !!p));
  const allPositions = [
    ...POSITION_ORDER.filter((p) => presentPositions.has(p)),
    ...Array.from(presentPositions).filter((p) => !POSITION_ORDER.includes(p)).sort(),
  ];

  const filteredPicks = picks.filter((pick) => {
    if (activeTeam && teamLabel(pick) !== activeTeam) return false;
    if (activeRound != null && pick.round !== activeRound) return false;
    if (activePosition && (pick.position ?? "").toUpperCase() !== activePosition) return false;
    return true;
  });

  // Group by (season_year, draft_type) preserving section order: initial
  // draft first (oldest), then each rookie draft newest-to-oldest, matching
  // getDraftHistory's season_year desc ordering -- except the initial draft
  // always belongs at the very top regardless of its year. Sections with no
  // picks left after filtering are dropped rather than shown empty.
  const sections = new Map<string, { title: string; picks: DraftPick[] }>();
  for (const pick of filteredPicks) {
    const key = `${pick.draft_type}-${pick.season_year}`;
    if (!sections.has(key)) {
      sections.set(key, { title: sectionTitle(pick), picks: [] });
    }
    sections.get(key)!.picks.push(pick);
  }

  const ordered = Array.from(sections.values());
  ordered.sort((a, b) => {
    const aInitial = a.picks[0]?.draft_type === "initial";
    const bInitial = b.picks[0]?.draft_type === "initial";
    if (aInitial && !bInitial) return -1;
    if (bInitial && !aInitial) return 1;
    return (b.picks[0]?.season_year ?? 0) - (a.picks[0]?.season_year ?? 0);
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-4xl tracking-wide mb-6">Draft History</h1>

      <div className="mb-10">
        <DraftFilters
          teams={allTeams}
          rounds={allRounds}
          positions={allPositions}
          activeTeam={activeTeam}
          activeRound={activeRound}
          activePosition={activePosition}
        />
      </div>

      {ordered.length === 0 ? (
        <p className="font-body opacity-60">No picks match this filter.</p>
      ) : (
        <div className="space-y-12">
          {ordered.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl text-[var(--color-rust)] mb-4 tracking-wide">
                {section.title}
              </h2>
              <div className="panel overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                      <th className="px-4 py-3 font-normal">Rd</th>
                      <th className="px-4 py-3 font-normal">Pick</th>
                      <th className="px-4 py-3 font-normal">Player</th>
                      <th className="px-4 py-3 font-normal">Pos</th>
                      <th className="px-4 py-3 font-normal">Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.picks.map((pick) => (
                      <tr key={pick.id} className="border-t border-[rgba(32,32,15,0.12)]">
                        <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.55)]">{pick.round}</td>
                        <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.55)]">{pick.pick_no}</td>
                        <td className="px-4 py-2.5 font-body">
                          {pick.player_name ?? "Unknown"}
                          {pick.is_keeper && (
                            <span className="ml-2 font-mono text-[10px] text-[rgba(32,32,15,0.4)] uppercase">
                              Keeper
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.6)]">{pick.position ?? "—"}</td>
                        <td className="px-4 py-2.5 font-body text-[rgba(32,32,15,0.8)]">
                          {pick.team_name ?? pick.manager_name ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
