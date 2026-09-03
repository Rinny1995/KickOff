import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, hashPassword } from "@/lib/auth";
import { LEAGUE_DEFAULTS } from "@/lib/leagueDefaults";
import { buildLeagueSettings, assignRosterToTeam } from "@/lib/leagueService";
import { proposeDraftSlots } from "@/lib/draftService";

const CreateLeagueSchema = z.object({
  leagueName: z.string().trim().min(3, "Liganame muss mindestens 3 Zeichen haben").max(40),
  teamName: z.string().trim().min(2, "Teamname muss mindestens 2 Zeichen haben").max(30),
  draftMode: z.enum(["snake", "assigned"]),
  visibility: z.enum(["link", "password"]),
  password: z.string().min(4).max(50).optional(),
  draftSlots: z
    .array(z.object({ id: z.string(), at: z.string() }))
    .min(1)
    .max(2)
    .optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateLeagueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }
  const { leagueName, teamName, draftMode, visibility, password, draftSlots } = parsed.data;

  if (visibility === "password" && !password) {
    return NextResponse.json(
      { error: "Für eine Liga mit Kennwort bitte ein Kennwort angeben" },
      { status: 400 }
    );
  }
  if (draftMode === "snake" && (!draftSlots || draftSlots.length === 0)) {
    return NextResponse.json(
      { error: "Bitte mindestens einen Terminvorschlag für den Draft angeben" },
      { status: 400 }
    );
  }

  const league = await prisma.league.create({
    data: {
      name: leagueName,
      season: new Date().getFullYear(),
      founderId: userId,
      visibility,
      joinPasswordHash: password ? await hashPassword(password) : null,
      settings: buildLeagueSettings({ draftMode }),
    },
  });

  const team = await prisma.team.create({
    data: {
      name: teamName,
      budget: BigInt(LEAGUE_DEFAULTS.startBudgetCents),
      userId,
      leagueId: league.id,
    },
  });

  if (draftMode === "assigned") {
    await assignRosterToTeam(league.id, team.id);
  } else if (draftSlots) {
    await proposeDraftSlots(league.id, userId, draftSlots);
  }

  return NextResponse.json({ leagueId: league.id, inviteCode: league.inviteCode });
}
