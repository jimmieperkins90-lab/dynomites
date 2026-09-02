"use client";

import { useState } from "react";
import type { LineageHop } from "@/lib/queries";

type Props =
  | { kind: "player"; sleeperPlayerId: string | null; playerName: string | null; label: string }
  | { kind: "draft_pick"; originalManagerId: string; season: number; round: number; label: string }
  | { kind: "given_up"; tradeId: string; sentByTeamSeasonId: string; label: string };

export default function TradeLineageButton(props: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hops, setHops] = useState<LineageHop[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (hops != null) return; // already fetched once, no need to refetch

    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams();
      params.set("kind", props.kind);
      if (props.kind === "player") {
        if (props.sleeperPlayerId) params.set("sleeperPlayerId", props.sleeperPlayerId);
        if (props.playerName) params.set("playerName", props.playerName);
      } else if (props.kind === "draft_pick") {
        params.set("originalManagerId", props.originalManagerId);
        params.set("season", String(props.season));
        params.set("round", String(props.round));
      } else {
        params.set("tradeId", props.tradeId);
        params.set("sentByTeamSeasonId", props.sentByTeamSeasonId);
      }
      const res = await fetch(`/api/trade-lineage?${params.toString()}`);
      const data = await res.json();
      setHops(data.hops ?? []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lineage-wrap">
      <button type="button" onClick={handleClick} className="lineage-trigger">
        {props.label}
      </button>
      {open && (
        <div className="lineage-panel">
          {loading && <p className="lineage-note">Loading history...</p>}
          {failed && <p className="lineage-note">Couldn&apos;t load history.</p>}
          {!loading && !failed && hops && hops.length === 0 && (
            <p className="lineage-note">No further trade history.</p>
          )}
          {!loading && !failed && hops && hops.length > 0 && (
            <ol className="lineage-list">
              {hops.map((hop, i) => (
                <li key={i} className="lineage-item">
                  {hop.kind === "trade" ? (
                    <>
                      {hop.from_team ?? "Unknown"} → {hop.to_team ?? "Unknown"}: {hop.asset_label}{" "}
                      (Week {hop.week})
                    </>
                  ) : (
                    <>
                      Drafted: {hop.team_name ?? "Unknown"} took {hop.player_name ?? "a player"} (
                      {hop.season_year} Round {hop.round}, Pick {hop.pick_no})
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <style jsx>{`
        .lineage-wrap {
          display: inline-block;
          width: 100%;
        }
        .lineage-trigger {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          color: inherit;
          text-align: left;
          text-decoration: underline dotted;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .lineage-trigger:hover {
          color: var(--color-rust);
        }
        .lineage-panel {
          margin-top: 0.5rem;
          padding: 0.6rem 0.9rem;
          border-left: 2px solid var(--color-rust);
          background: rgba(0, 0, 0, 0.03);
        }
        .lineage-note {
          font-size: 0.85rem;
          opacity: 0.6;
        }
        .lineage-list {
          list-style: decimal;
          padding-left: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
