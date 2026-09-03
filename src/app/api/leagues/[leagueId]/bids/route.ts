import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { placeBid, MarketError } from "@/lib/marketService";

const BidSchema = z.object({
  playerId: z.string().min(1),
  amountCents: z.string().regex(/^\d+$/, "Ungültiger Betrag"),
});

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = BidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const team = await getOwnTeamInLeague(userId, params.leagueId);
  if (!team) return NextResponse.json({ error: "Kein Team in dieser Liga" }, { status: 403 });

  try {
    await placeBid(params.leagueId, team.id, parsed.data.playerId, BigInt(parsed.data.amountCents));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MarketError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
