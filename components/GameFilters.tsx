"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function GameFilters({
  weeks,
  managers,
  activeWeek,
  activeManager,
}: {
  weeks: number[];
  managers: string[];
  activeWeek: number | null;
  activeManager: string | null;
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
        value={activeWeek ?? ""}
        onChange={(e) => update("week", e.target.value)}
        className={selectClass}
      >
        <option value="">All weeks</option>
        {weeks.map((w) => (
          <option key={w} value={w}>
            Week {w}
          </option>
        ))}
      </select>
      <select
        value={activeManager ?? ""}
        onChange={(e) => update("manager", e.target.value)}
        className={selectClass}
      >
        <option value="">All managers</option>
        {managers.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
