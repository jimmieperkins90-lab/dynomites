"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/betting", label: "Sportsbook" },
  { href: "/standings", label: "Seasons" },
  { href: "/players", label: "Players" },
  { href: "/trades", label: "Trades" },
  { href: "/draft", label: "Drafts" },
  { href: "/valuations", label: "Valuations" },
  { href: "/history", label: "Records" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full border-b-4 border-[var(--color-ink)]"
      style={{ backgroundColor: "var(--color-green-deep)" }}
    >
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-16 overflow-x-auto">
        <Link href="/" className="outline font-display text-lg tracking-widest flex items-center gap-2 shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-cream)"
            strokeWidth="3"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 4 L7 12" />
            <path d="M12 3 L12 12" />
            <path d="M18 4 L17 12" />
          </svg>
          DYNO MITES
        </Link>
        <div className="flex gap-1 shrink-0">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm font-extrabold px-3 py-1.5 rounded whitespace-nowrap"
                style={{
                  color: active ? "var(--color-cream)" : "rgba(242, 232, 201, 0.6)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
