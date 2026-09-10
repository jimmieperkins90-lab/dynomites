"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TickerItem } from "@/lib/queries";

// Pixels per second the ticker scrolls at. Kept constant regardless of how
// many items are in the ticker -- previously this used a fixed 50s
// animation duration for the whole track, which meant the ticker sped up
// every time more items were added (more season records, clinches, trades),
// since the same distance had to be covered in the same fixed time no
// matter how much longer the track got.
const SCROLL_SPEED_PX_PER_SEC = 60;

export default function NewsTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly at the -50% mark.
  const looped = [...items, ...items];

  // Measure the actual rendered width of ONE copy of the content (half the
  // doubled track, since that's the real distance the animation travels
  // before it loops) and derive a duration from that against a constant
  // speed, instead of using a fixed duration for a variable-length track.
  useEffect(() => {
    function measure() {
      if (!trackRef.current) return;
      const fullWidth = trackRef.current.scrollWidth;
      const singleCopyWidth = fullWidth / 2;
      if (singleCopyWidth > 0) {
        setDurationSec(singleCopyWidth / SCROLL_SPEED_PX_PER_SEC);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items]);

  return (
    <div
      className="ticker-wrap panel mb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className={`ticker-track ${paused ? "ticker-paused" : ""}`}
        style={durationSec != null ? { animationDuration: `${durationSec}s` } : undefined}
      >
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
          /* Fallback duration for the first paint before useEffect measures
             the real content width -- animationDuration inline style above
             overrides this as soon as it's available. */
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
