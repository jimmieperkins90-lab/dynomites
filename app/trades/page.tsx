import { getAllTrades, type Trade, type TradeItem } from "@/lib/queries";
import TradeLineageButton from "@/components/TradeLineageButton";

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

function TradeCard({ trade }: { trade: Trade }) {
  const byTeam = groupByTeam(trade.items);
  const date = new Date(trade.status_updated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="panel px-5 py-4">
      <p className="font-body text-sm opacity-60 mb-3">
        {date} · {trade.season_year} Season · Week {trade.week}
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from(byTeam.entries()).map(([team, items]) => (
          <div key={team}>
            <p className="font-display text-lg mb-1">{team}</p>
            <ul className="flex flex-col gap-1.5">
              {items.map((item, i) => (
                <li key={i} className="font-body text-sm">
                  {item.item_type === "player" ? (
                    <TradeLineageButton
                      kind="player"
                      sleeperPlayerId={item.sleeper_player_id}
                      playerName={item.player_name}
                      label={itemLabel(item)}
                    />
                  ) : item.original_manager_id && item.traded_pick_season && item.traded_pick_round ? (
                    <TradeLineageButton
                      kind="draft_pick"
                      originalManagerId={item.original_manager_id}
                      season={item.traded_pick_season}
                      round={item.traded_pick_round}
                      label={itemLabel(item)}
                    />
                  ) : (
                    itemLabel(item)
                  )}
                </li>
              ))}
            </ul>
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
      <h1 className="outline font-display text-5xl tracking-wide text-center mb-2">Trade History</h1>
      <p className="font-body font-semibold text-center opacity-70 mb-10">
        Every trade on record — click any player or pick to see what it became.
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
