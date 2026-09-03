import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, verifyPassword } from "@/lib/auth";
import { assignRosterToTeam } from "@/lib/leagueService";
import { LEAGUE_DEFAULTS } from "@/lib/leagueDefaults";

const JoinLeagueSchema = z.object({
  inviteCode: z.string().trim().min(1),
  teamName: z.string().trim().min(2, "Teamname muss mindestens 2 Zeichen haben").max(30),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = JoinLeagueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const { inviteCode, teamName, password } = parsed.data;

  const league = await prisma.league.findUnique({
    where: { inviteCode },
    include: { teams: { select: { id: true } } },
  });
  if (!league) {
    return NextResponse.json({ error: "Diese Liga wurde nicht gefunden" }, { status: 404 });
  }

  if (league.visibility === "password") {
    const ok = password && league.joinPasswordHash
      ? await verifyPassword(password, league.joinPasswordHash)
      : false;
    if (!ok) {
      return NextResponse.json({ error: "Kennwort ist falsch" }, { status: 401 });
    }
  }

  const settings = league.settings as { maxTeams?: number; draftMode?: "snake" | "assigned" };
  if (settings.maxTeams && league.teams.length >= settings.maxTeams) {
    return NextResponse.json({ error: "Diese Liga ist bereits voll" }, { status: 409 });
  }

  const existingTeam = await prisma.team.findUnique({
    where: { userId_leagueId: { userId, leagueId: league.id } },
  });
  if (existingTeam) {
    return NextResponse.json({ error: "Du bist dieser Liga schon beigetreten" }, { status: 409 });
  }

  const team = await prisma.team.create({
    data: {
      name: teamName,
      budget: BigInt(LEAGUE_DEFAULTS.startBudgetCents), // bei "assigned" gleich durch assignRosterToTeam erhöht (Ausgleich)
      userId,
      leagueId: league.id,
    },
  });

  if (settings.draftMode === "assigned") {
    await assignRosterToTeam(league.id, team.id);
  }

  return NextResponse.json({ leagueId: league.id });
}
