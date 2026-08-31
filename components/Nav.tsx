"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/games", label: "Games" },
  { href: "/players", label: "Players" },
  { href: "/history", label: "History" },
  { href: "/draft", label: "Draft" },
  { href: "/betting", label: "Betting" },
  { href: "/articles", label: "Articles" },
  { href: "/valuations", label: "Valuations" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full border-b-4 border-[var(--color-ink)]"
      style={{ backgroundColor: "var(--color-green-deep)" }}
    >
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-16 overflow-x-auto">
        <span className="outline font-display text-lg tracking-widest flex items-center gap-2 shrink-0">
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
        </span>
        <div className="flex gap-1 shrink-0">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
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
