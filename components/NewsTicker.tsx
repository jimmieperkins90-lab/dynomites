"use client";

import Link from "next/link";
import { useState } from "react";
import type { TickerItem } from "@/lib/queries";

export default function NewsTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);

  if (items.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly at the -50% mark.
  const looped = [...items, ...items];

  return (
    <div
      className="ticker-wrap panel mb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className={`ticker-track ${paused ? "ticker-paused" : ""}`}>
        {looped.map((item, i) => (
          <span key={`${item.id}-${i}`} className="ticker-item font-body">
            {item.href ? (
              <Link href={item.href} className="ticker-link">
                {item.text}
              </Link>
            ) : (
              item.text
            )}
            <span className="ticker-dot" aria-hidden="true">·</span>
          </span>
        ))}
      </div>
      <style jsx>{`
        .ticker-wrap {
          overflow: hidden;
          white-space: nowrap;
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
        }
        .ticker-track {
          display: inline-flex;
          animation: ticker-scroll 50s linear infinite;
        }
        .ticker-paused {
          animation-play-state: paused;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          padding: 0 1.5rem;
        }
        .ticker-link {
          color: inherit;
          text-decoration: none;
        }
        .ticker-link:hover {
          color: var(--color-rust);
        }
        .ticker-dot {
          margin-left: 1.5rem;
          opacity: 0.35;
        }
        @keyframes ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
