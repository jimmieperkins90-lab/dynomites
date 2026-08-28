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
      <h1 className="font-display text-4xl text-bone tracking-wide mb-2">Franchise Valuations</h1>
      <p className="font-mono text-xs text-bone/50 mb-8">Updated manually by the commissioner</p>

      {valuations.length === 0 ? (
        <p className="font-body text-bone/60">No valuations set yet.</p>
      ) : (
        <div className="fossil-card bg-basalt border border-olive/30 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-bone/50 font-mono text-xs uppercase">
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">Manager</th>
                <th className="px-4 py-3 font-normal text-right">Value</th>
                <th className="px-4 py-3 font-normal text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {valuations.map((v, i) => (
                <tr key={v.manager_id} className="border-t border-olive/10">
                  <td className="px-4 py-2.5 font-mono text-bone/60">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-body text-bone">{v.manager_name}</p>
                    {v.note && <p className="font-mono text-xs text-bone/50">{v.note}</p>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-amber">
                    ${v.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-bone/40 text-xs">
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
