import { NextRequest } from "next/server";
import { getAssetLineage, getGivenUpAssetLineage } from "@/lib/queries";

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
    const originalManagerId = params.get("originalManagerId");
    const season = Number(params.get("season"));
    const round = Number(params.get("round"));
    if (!originalManagerId || !season || !round) {
      return Response.json({ error: "missing params" }, { status: 400 });
    }
    const hops = await getAssetLineage({ kind: "draft_pick", originalManagerId, season, round });
    return Response.json({ hops });
  }

  if (kind === "given_up") {
    const tradeId = params.get("tradeId");
    const sentByTeamSeasonId = params.get("sentByTeamSeasonId");
    if (!tradeId || !sentByTeamSeasonId) {
      return Response.json({ error: "missing params" }, { status: 400 });
    }
    const hops = await getGivenUpAssetLineage(tradeId, sentByTeamSeasonId);
    return Response.json({ hops });
  }

  return Response.json({ error: "invalid kind" }, { status: 400 });
}
