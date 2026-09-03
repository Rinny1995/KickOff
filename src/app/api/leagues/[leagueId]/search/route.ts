import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ players: [] });

  const players = await prisma.player.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      rosterSlots: { none: { team: { leagueId: params.leagueId } } },
      listings: { none: { leagueId: params.leagueId, resolved: false } },
    },
    take: 20,
    orderBy: { marketValue: "desc" },
  });

  return NextResponse.json({
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      nflTeam: p.nflTeam,
      status: p.status,
      marketValue: p.marketValue.toString(),
    })),
  });
}
