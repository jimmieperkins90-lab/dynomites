export const dynamic = "force-dynamic";

// TEMPORARY DIAGNOSTIC ROUTE -- delete this file once the Supabase
// project-mismatch question is resolved. Only reveals the project-ref
// subdomain of URL-shaped env vars (not a secret) and never reveals any
// part of a key/secret/token-named var's value, just whether it's set.
export async function GET() {
  const results: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.toUpperCase().includes("SUPABASE")) continue;
    if (!value) continue;

    if (/KEY|SECRET|TOKEN/i.test(key)) {
      results[key] = "(set, value hidden)";
      continue;
    }

    const match = value.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    results[key] = match ? `project ref: ${match[1]}` : "(set, not a supabase.co URL)";
  }

  return Response.json(results);
}
