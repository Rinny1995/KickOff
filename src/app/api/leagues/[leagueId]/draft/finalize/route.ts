import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { finalizeDraftSlot, DraftError } from "@/lib/draftService";

const FinalizeSchema = z.object({ slotId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = FinalizeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  try {
    await finalizeDraftSlot(params.leagueId, userId, parsed.data.slotId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DraftError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
