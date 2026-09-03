import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOwnTeamInLeague } from "@/lib/leagueService";

const WatchSchema = z.object({ playerId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = WatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const team = await getOwnTeamInLeague(userId, params.leagueId);
  if (!team) return NextResponse.json({ error: "Kein Team in dieser Liga" }, { status: 403 });

  const existing = await prisma.watchlistEntry.findUnique({
    where: { teamId_playerId: { teamId: team.id, playerId: parsed.data.playerId } },
  });

  if (existing) {
    await prisma.watchlistEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ watched: false });
  }

  await prisma.watchlistEntry.create({
    data: { teamId: team.id, playerId: parsed.data.playerId },
  });
  return NextResponse.json({ watched: true });
}
