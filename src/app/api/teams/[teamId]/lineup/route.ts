import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { ROSTER_RULES, validateLineup } from "@/lib/draft";
import { earliestKickoff } from "@/lib/schedule";

const SaveLineupSchema = z.object({
  week: z.number().int().min(1).max(18),
  slots: z.record(z.string(), z.string()),
  irPlayerIds: z.array(z.string()).max(ROSTER_RULES.irSize),
});

export async function POST(request: Request, { params }: { params: { teamId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SaveLineupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const { week, slots, irPlayerIds } = parsed.data;

  const team = await prisma.team.findUnique({
    where: { id: params.teamId },
    include: { roster: { include: { player: true } }, league: { select: { season: true } } },
  });
  if (!team || team.userId !== userId) {
    return NextResponse.json({ error: "Team nicht gefunden" }, { status: 404 });
  }

  const games = await prisma.nflGame.findMany({ where: { season: team.league.season, week } });
  const lockAt = earliestKickoff(games);
  if (lockAt && Date.now() >= lockAt.getTime()) {
    return NextResponse.json(
      { error: "Aufstellung ist eingefroren – das erste Spiel der Woche läuft bereits" },
      { status: 403 }
    );
  }

  const rosterByPlayerId = new Map(team.roster.map((r) => [r.playerId, r]));

  // IR: nur verletzte Spieler, maximal 2 Plätze.
  for (const playerId of irPlayerIds) {
    const slot = rosterByPlayerId.get(playerId);
    if (!slot) {
      return NextResponse.json({ error: "Spieler gehört nicht zu deinem Kader" }, { status: 400 });
    }
    if (slot.player.status !== "injured" && slot.player.status !== "ir") {
      return NextResponse.json(
        { error: `${slot.player.name} ist nicht verletzt und kann nicht auf die IR` },
        { status: 400 }
      );
    }
  }

  // Aufstellungs-Spieler dürfen nicht gleichzeitig auf der IR stehen und
  // müssen zum eigenen Kader gehören.
  const irSet = new Set(irPlayerIds);
  for (const playerId of Object.values(slots)) {
    if (!playerId) continue;
    if (!rosterByPlayerId.has(playerId)) {
      return NextResponse.json({ error: "Spieler gehört nicht zu deinem Kader" }, { status: 400 });
    }
    if (irSet.has(playerId)) {
      return NextResponse.json(
        { error: "Ein Spieler auf der IR kann nicht gleichzeitig aufgestellt sein" },
        { status: 400 }
      );
    }
  }

  const playerPositions = Object.fromEntries(
    team.roster.map((r) => [r.playerId, r.player.position])
  );
  const validation = validateLineup(slots, playerPositions);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
  }

  await prisma.$transaction([
    ...team.roster.map((r) =>
      prisma.rosterSlot.update({
        where: { id: r.id },
        data: { onIr: irSet.has(r.playerId) },
      })
    ),
    prisma.lineup.upsert({
      where: { teamId_season_week: { teamId: team.id, season: team.league.season, week } },
      create: { teamId: team.id, season: team.league.season, week, slots },
      update: { slots },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
