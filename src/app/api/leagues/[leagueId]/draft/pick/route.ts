import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { makePick, DraftError } from "@/lib/draftService";

const PickSchema = z.object({ playerId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = PickSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const team = await getOwnTeamInLeague(userId, params.leagueId);
  if (!team) return NextResponse.json({ error: "Kein Team in dieser Liga" }, { status: 403 });

  try {
    await makePick(params.leagueId, team.id, parsed.data.playerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DraftError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
