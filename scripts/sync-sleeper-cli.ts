// Optional local alternative to visiting /api/sync in a browser.
// Run with: npm run sync

import "dotenv/config";
import { runSleeperSync } from "../lib/syncSleeper";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !LEAGUE_ID) {
  console.error(
    "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SLEEPER_LEAGUE_ID (see .env.local.example)."
  );
  process.exit(1);
}

runSleeperSync(
  { supabaseUrl: SUPABASE_URL, serviceRoleKey: SERVICE_ROLE_KEY, leagueId: LEAGUE_ID },
  console.log
).catch((e) => {
  console.error(e);
  process.exit(1);
});
