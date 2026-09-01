import { NextRequest } from "next/server";
import { getAssetLineage } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const kind = params.get("kind");

  if (kind === "player") {
    const hops = await getAssetLineage({
      kind: "player",
      sleeperPlayerId: params.get("sleeperPlayerId"),
      playerName: params.get("playerName"),
    });
    return Response.json({ hops });
  }

  if (kind === "draft_pick") {
    const startTeamSeasonId = params.get("startTeamSeasonId");
    const season = Number(params.get("season"));
    const round = Number(params.get("round"));
    if (!startTeamSeasonId || !season || !round) {
      return Response.json({ error: "missing params" }, { status: 400 });
    }
    const hops = await getAssetLineage({ kind: "draft_pick", startTeamSeasonId, season, round });
    return Response.json({ hops });
  }

  return Response.json({ error: "invalid kind" }, { status: 400 });
}
