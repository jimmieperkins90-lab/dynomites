import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public, read-only client -- RLS policies only allow SELECT for anon/publishable keys.
//
// Created lazily (not at module load time) so a missing env var doesn't
// crash the whole Next.js build during "Collecting page data" -- it only
// returns null, which the page turns into a friendly in-page message
// instead of a failed deployment.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
