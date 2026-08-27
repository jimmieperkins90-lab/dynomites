"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Standings" },
  { href: "/games", label: "Games" },
  { href: "/history", label: "History" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b border-olive/30 bg-basalt">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-display text-lg text-amber tracking-widest">DYNO MITES</span>
        <div className="flex gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono text-sm px-3 py-1.5 rounded ${
                  active ? "text-amber" : "text-bone/60 hover:text-bone"
                }`}
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
