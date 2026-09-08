import { getAllTrades, type Trade, type TradeItem } from "@/lib/queries";

export const dynamic = "force-dynamic";

function groupByTeam(items: TradeItem[]): Map<string, TradeItem[]> {
  const map = new Map<string, TradeItem[]>();
  for (const item of items) {
    const key = item.team_name ?? item.manager_name ?? "Unknown team";
    (map.get(key) ?? map.set(key, []).get(key)!).push(item);
  }
  return map;
}

function itemLabel(item: TradeItem): string {
  if (item.item_type === "player") return item.player_name ?? "Unknown player";
  return `${item.traded_pick_season ?? "?"} Round ${item.traded_pick_round ?? "?"} pick`;
}

function TeamColumn({ team, items }: { team: string; items: TradeItem[] }) {
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-lg tracking-wide">{team}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">receives</span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, j) => (
          <li
            key={j}
            className="font-body text-sm px-3 py-2 rounded bg-[rgba(32,32,15,0.04)] border-l-2 border-[var(--color-gold)]"
          >
            {itemLabel(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const byTeam = groupByTeam(trade.items);
  const teamEntries = Array.from(byTeam.entries());
  const date = new Date(trade.status_updated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="panel px-6 py-5">
      <p className="font-mono text-xs uppercase tracking-widest opacity-50 mb-4">
        {date} · {trade.season_year} Season · Week {trade.week}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {teamEntries.map(([team, items], i) => (
          <div key={team} className="flex items-stretch gap-4 flex-1">
            <TeamColumn team={team} items={items} />
            {i < teamEntries.length - 1 && (
              <span className="hidden sm:flex items-center text-xl opacity-30 font-mono">⇄</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function TradesPage() {
  const trades = await getAllTrades();

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="page-heading font-display text-5xl tracking-wide text-center mb-2">Trade History</h1>
      <p className="font-body font-semibold text-center opacity-70 mb-10">
        Every trade on record.
      </p>

      {trades.length === 0 ? (
        <p className="font-body opacity-70 text-center">No trades recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {trades.map((trade) => (
            <TradeCard key={trade.trade_id} trade={trade} />
          ))}
        </div>
      )}
    </main>
  );
}
