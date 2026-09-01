"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DraftFilters({
  teams,
  rounds,
  positions,
  activeTeam,
  activeRound,
  activePosition,
}: {
  teams: string[];
  rounds: number[];
  positions: string[];
  activeTeam: string | null;
  activeRound: number | null;
  activePosition: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClass =
    "font-mono text-sm px-3 py-1.5 border rounded border-[rgba(32,32,15,0.3)] bg-[var(--color-cream)] text-[var(--color-ink)]";

  return (
    <div className="flex gap-3 flex-wrap">
      <select
        value={activeTeam ?? ""}
        onChange={(e) => update("team", e.target.value)}
        className={selectClass}
      >
        <option value="">All teams</option>
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={activeRound ?? ""}
        onChange={(e) => update("round", e.target.value)}
        className={selectClass}
      >
        <option value="">All rounds</option>
        {rounds.map((r) => (
          <option key={r} value={r}>
            Round {r}
          </option>
        ))}
      </select>
      <select
        value={activePosition ?? ""}
        onChange={(e) => update("position", e.target.value)}
        className={selectClass}
      >
        <option value="">All positions</option>
        {positions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
