import { NextRequest, NextResponse } from "next/server";
import { runSleeperSync } from "@/lib/syncSleeper";

// Two ways to trigger this route:
// 1. Manually: visit /api/sync?secret=YOUR_SYNC_SECRET in a browser.
// 2. Automatically: Vercel Cron (see vercel.json) calls this on a schedule,
//    authenticating via an `Authorization: Bearer $CRON_SECRET` header that
//    Vercel adds automatically -- this never appears in your repo.
export const maxDuration = 60; // seconds -- a full backfill can take a little while

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.SYNC_SECRET && secret === process.env.SYNC_SECRET) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
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
        debug: {
          supabaseUrlLooksRight: supabaseUrl.startsWith("https://") && supabaseUrl.includes(".supabase.co"),
          serviceRoleKeyLength: serviceRoleKey.length,
        },
      },
      { status: 500 }
    );
  }
}
