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
  if (!client) {
    client = createClient(url, key, {
      global: {
        // IMPORTANT: Next.js's App Router patches the global fetch() to
        // provide its own Data Cache, which can cache a fetch call
        // indefinitely based on the request's own shape -- independent of
        // any page-level `dynamic = "force-dynamic"` export, and
        // completely invisible to browser hard-refreshes, CDN caching, or
        // URL cache-busting, none of which touch this layer. Without this
        // override, a function that's been called with the same query
        // shape since early in the project (e.g. getStandingsForSeason)
        // can keep serving a response cached from back then, while a
        // brand-new query with a never-before-seen shape correctly returns
        // fresh data -- exactly the symptom that gave this away. Every
        // request through this client explicitly opts out.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
  }
  return client;
}
