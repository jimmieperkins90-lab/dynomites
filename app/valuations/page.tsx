import { getFranchiseValuations } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ValuationsPage() {
  const valuations = await getFranchiseValuations();

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-4xl tracking-wide mb-4">Franchise Valuations</h1>

      <div className="panel p-5 mb-8">
        <p className="font-body text-sm text-[rgba(32,32,15,0.8)]">
          Each franchise is valued on a mix of Success &amp; History, Brand Power, Roster
          Strength, Ownership, and Peer/Expert Rankings. Values are a snapshot, not a fixed
          price — expect them to move as rosters, records, and reputations change season to
          season.
        </p>
      </div>

      {valuations.length === 0 ? (
        <p className="font-body opacity-60">No valuations set yet.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-[rgba(32,32,15,0.5)] font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">Team</th>
                <th className="px-4 py-3 font-normal text-right">Value</th>
                <th className="px-4 py-3 font-normal text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {valuations.map((v, i) => (
                <tr key={v.manager_id} className="border-t border-[rgba(32,32,15,0.12)]">
                  <td className="px-4 py-2.5 font-mono text-[rgba(32,32,15,0.55)]">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-body">{v.team_name ?? v.manager_name}</p>
                    <p className="font-mono text-xs text-[rgba(32,32,15,0.5)]">{v.manager_name}</p>
                    {v.note && (
                      <p className="font-mono text-xs text-[rgba(32,32,15,0.4)] mt-1">{v.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-[var(--color-gold)] font-bold">
                    ${v.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-[rgba(32,32,15,0.4)] text-xs">
                    {formatDate(v.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
