import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { proposeDraftSlots, DraftError } from "@/lib/draftService";

const ProposeSchema = z.object({
  slots: z
    .array(z.object({ id: z.string(), at: z.string() }))
    .min(1)
    .max(2),
});

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = ProposeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  try {
    await proposeDraftSlots(params.leagueId, userId, parsed.data.slots);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DraftError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
