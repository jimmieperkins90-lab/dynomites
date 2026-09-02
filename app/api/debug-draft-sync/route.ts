import { NextResponse } from "next/server";
import { getDraft, getDraftPicks } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

export async function GET() {
  const draftId = "1314667784864538624"; // 2026 Dyno Mites rookie draft

  const result: any = { draftId };

  try {
    const fullDraft = await getDraft(draftId);
    result.fullDraft = fullDraft;
    result.slotToRosterIdKeys = fullDraft.slot_to_roster_id
      ? Object.keys(fullDraft.slot_to_roster_id)
      : null;
  } catch (e: any) {
    result.getDraftError = e?.message ?? String(e);
  }

  try {
    const picks = await getDraftPicks(draftId);
    result.pickCount = picks.length;
    result.samplePicks = picks.slice(0, 5).map((p) => ({
      round: p.round,
      pick_no: p.pick_no,
      roster_id: p.roster_id,
      draft_slot: p.draft_slot,
    }));
  } catch (e: any) {
    result.getDraftPicksError = e?.message ?? String(e);
  }

  return NextResponse.json(result, { status: 200 });
}
