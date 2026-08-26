# Dyno Mites

Fantasy football league history site for the Dyno Mites (Sleeper). Built on
Next.js 14 + TypeScript + Tailwind + Supabase (Postgres) + Vercel, following
the same pattern as the RBB league site, adapted for Sleeper's data model.

## Stack & access model

- **Data changes** (re-running the sync, one-off corrections): Claude has
  direct Supabase access (via MCP tools) and can write straight to the
  database, or you can run `npm run sync` yourself.
- **Code changes**: Claude has no direct GitHub access. Workflow is:
  1. You paste the current content of the affected file(s), or say "new file."
  2. Claude hands back the **complete file**.
  3. You paste it into GitHub's web editor and commit -> Vercel auto-deploys.
  4. Paste back the raw committed content so Claude can diff and catch paste
     corruption (GitHub's web editor has been known to mangle multi-line JSX).

## First-time setup -- no terminal required

1. Upload every file in this project (except `.env.local.example`, which is
   just a template) to `jimmieperkins90-lab/dynomites` on GitHub via the web
   "Add file -> Upload files" flow, preserving the folder structure.
2. In Vercel, import that repo as a new project. Before deploying, add these
   Environment Variables (Settings -> Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` -- from `.env.local.example`, already correct
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- from `.env.local.example`, already correct
   - `SUPABASE_SERVICE_ROLE_KEY` -- Supabase dashboard -> Project Settings -> API -> `service_role` key
   - `SLEEPER_LEAGUE_ID` -- already correct in `.env.local.example`
   - `SYNC_SECRET` -- make up any password-like string
3. Deploy. Once it's live, visit `https://<your-site>.vercel.app/api/sync?secret=<your SYNC_SECRET>`
   in your browser. That pulls the season from Sleeper and populates the
   database -- you'll see a JSON response with a log of what it did.
4. Visit the homepage to see the standings.
5. Re-run step 3 (just revisit that URL) any time you want to refresh data --
   safe to run repeatedly.

## Optional: local development (only if you have Node.js working)

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in the same values as above.
3. `npm run sync` -- runs the same sync from your own machine instead of the `/api/sync` URL.
4. `npm run dev` -- preview at localhost:3000 before pushing changes.

## Why Sleeper instead of the Yahoo workaround

Sleeper's API (`api.sleeper.app/v1`) is fully public and read-only -- no
developer approval, no auth token, no manual spreadsheet uploads needed. The
sync script (`scripts/sync-sleeper.ts`) pulls directly from it. Rate limit is
1000 req/min; the script's well under that even for a full-season backfill.

## Sleeper-specific gotchas (differ from the Yahoo/RBB project)

- **League ID is not stable across seasons.** Sleeper creates a *new*
  `league_id` every year, chained via `previous_league_id`. The `seasons`
  table stores one `sleeper_league_id` per year -- to backfill a past season,
  set `SLEEPER_LEAGUE_ID` to that year's own id and re-run `npm run sync`.
- **`roster_id` is only unique within a season**, not globally. Always join
  through `team_seasons (season_id, sleeper_roster_id)`, never bare roster_id.
- **Playoff bracket shape varies by league settings** (3rd-place game on/off,
  number of playoff teams). `sync-sleeper.ts` makes a best-effort guess at
  `round_game` labels and final placement -- once this league's first
  playoffs actually happen, fetch the real `winners_bracket`/`losers_bracket`
  JSON and verify the labels look right (per the "verify empirically" rule --
  don't assume the guess is correct for this league's specific settings).
- **Starter *slot* (e.g. which WR/FLEX) isn't reliably derivable.** Sleeper
  gives a `starters` array and the league's `roster_positions` array, but
  matching them positionally breaks down around FLEX spots. `lineups.started`
  (bool) and `lineups.position` (the player's actual NFL position) are
  reliable; a precise slot label is not currently stored.
- **Full player list is ~5MB.** `getPlayerMap()` caches it to
  `scripts/.cache/players.json` for 24h rather than refetching every sync.

## Schema

Same shape as the RBB project's pattern (entity / period / membership / event
/ detail tables), renamed for Sleeper's vocabulary:

- `managers` -- entity table, one row per person (keyed on `sleeper_user_id`)
- `seasons` -- period table, one row per year
- `team_seasons` -- membership table: manager x season, standings/outcomes
- `matchups` -- event table: one row per team per week
- `lineups` -- detail table: one row per (matchup, player)
- `players_cache` -- small lookup so we don't refetch Sleeper's full player
  list constantly; populated lazily from players actually seen in a lineup

## Known code gotchas to carry forward

- **GitHub's web editor can corrupt pasted JSX** -- specifically stripping
  bare `<` at line-start before wrapped multi-line attribute lists. Favor
  single-line opening tags where reasonable, and diff after big pastes.
- **Supabase's "Max Rows" setting silently truncates** unpaginated queries.
  Use `lib/fetchAllRows.ts` for anything that could grow past ~1000 rows.
- **Deploy coupled files together.** If a page and a child component change
  together (new props), deploy both in the same commit.
