import { NextRequest, NextResponse } from "next/server";
import { runSleeperSync } from "@/lib/syncSleeper";

// Visit /api/sync?secret=YOUR_SYNC_SECRET in a browser to run the sync.
// The secret just stops a random visitor from triggering writes to your DB --
// it's read from the SYNC_SECRET env var (set it in Vercel, make it up
// yourself, doesn't need to be fancy).
export const maxDuration = 60; // seconds -- a full backfill can take a little while

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect secret." }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const leagueId = req.nextUrl.searchParams.get("league_id") ?? process.env.SLEEPER_LEAGUE_ID;

  if (!supabaseUrl || !serviceRoleKey || !leagueId) {
    return NextResponse.json(
      { error: "Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SLEEPER_LEAGUE_ID." },
      { status: 500 }
    );
  }

  const lines: string[] = [];
  try {
    await runSleeperSync({ supabaseUrl, serviceRoleKey, leagueId }, (line) => lines.push(line));
    return NextResponse.json({ ok: true, log: lines });
  } catch (e: any) {
    const cause = e?.cause ? String(e.cause?.message ?? e.cause) : undefined;
    return NextResponse.json(
      {
        ok: false,
        log: lines,
        error: String(e?.message ?? e),
        cause,
        // Sanity-check env vars without leaking the secret key itself.
        debug: {
          supabaseUrlLooksRight: supabaseUrl.startsWith("https://") && supabaseUrl.includes(".supabase.co"),
          serviceRoleKeyLength: serviceRoleKey.length,
        },
      },
      { status: 500 }
    );
  }
}
