import { getAllTrades, type Trade, type TradeItem } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Sleeper buckets preseason trades under the same "week 1" leg as actual
// Week 1 trades -- there's no separate flag in the data to tell them apart.
// The trade's real calendar date is the reliable signal instead: anything
// dated December-August falls outside the active regular season, so it
// reads as "Offseason" rather than a misleading week number.
const OFFSEASON_MONTHS = new Set([12, 1, 2, 3, 4, 5, 6, 7, 8]);

function formatDateLine(trade: Trade): string {
  const d = new Date(trade.status_updated);
  const date = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const month = d.getMonth() + 1;
  const periodLabel = OFFSEASON_MONTHS.has(month) ? "Offseason" : `Week ${trade.week}`;
  return `${date} · ${trade.season_year} Season · ${periodLabel}`;
}

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
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-base sm:text-lg tracking-wide truncate">{team}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-40 shrink-0">receives</span>
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

  return (
    <div className="panel px-4 py-4 sm:px-6 sm:py-5">
      <p className="font-mono text-xs uppercase tracking-widest opacity-50 mb-4">{formatDateLine(trade)}</p>

      <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
        {teamEntries.map(([team, items], i) => (
          <div key={team} className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 flex-1 min-w-0">
            <TeamColumn team={team} items={items} />
            {i < teamEntries.length - 1 && (
              <>
                <span
                  className="flex sm:hidden items-center justify-center text-lg opacity-30 font-mono"
                  aria-hidden="true"
                >
                  ↓
                </span>
                <span
                  className="hidden sm:flex items-center text-xl opacity-30 font-mono shrink-0"
                  aria-hidden="true"
                >
                  ⇄
                </span>
              </>
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
      <h1 className="page-heading font-display text-4xl sm:text-5xl tracking-wide text-center mb-2">
        Trade History
      </h1>
      <p className="font-body font-semibold text-center opacity-70 mb-8 sm:mb-10 px-2">
        Every trade on record.
      </p>

      {trades.length === 0 ? (
        <p className="font-body opacity-70 text-center">No trades recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          {trades.map((trade) => (
            <TradeCard key={trade.trade_id} trade={trade} />
          ))}
        </div>
      )}
    </main>
  );
}
