import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const VALID_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

export async function GET(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const position = url.searchParams.get("position") ?? "";

  const players = await prisma.player.findMany({
    where: {
      rosterSlots: { none: { team: { leagueId: params.leagueId } } },
      ...(q.length >= 1 ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(VALID_POSITIONS.has(position) ? { position: position as any } : {}),
    },
    orderBy: { marketValue: "desc" },
    take: 40,
  });

  return NextResponse.json({
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      nflTeam: p.nflTeam,
      marketValue: p.marketValue.toString(),
    })),
  });
}
