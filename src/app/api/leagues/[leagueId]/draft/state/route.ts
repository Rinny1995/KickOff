import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { tickDraft } from "@/lib/draftService";

export async function GET(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  const team = await getOwnTeamInLeague(userId, params.leagueId);
  if (!team) return NextResponse.json({ error: "Kein Team in dieser Liga" }, { status: 403 });

  const draft = await tickDraft(params.leagueId);

  const [teams, recentPicks, ownRoster, league] = await Promise.all([
    prisma.team.findMany({ where: { leagueId: params.leagueId }, select: { id: true, name: true } }),
    prisma.draftPick.findMany({
      where: { draftId: draft.id },
      orderBy: { pickNumber: "desc" },
      take: 10,
      include: { player: true, team: { select: { name: true } } },
    }),
    prisma.rosterSlot.findMany({ where: { teamId: team.id }, include: { player: true } }),
    prisma.league.findUniqueOrThrow({ where: { id: params.leagueId }, select: { founderId: true } }),
  ]);

  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const order = (draft.order as unknown as string[] | null) ?? [];

  return NextResponse.json({
    isFounder: league.founderId === userId,
    ownTeamId: team.id,
    proposedSlots: draft.proposedSlots,
    votes: draft.votes,
    scheduledAt: draft.scheduledAt,
    startedAt: draft.startedAt,
    completed: draft.completed,
    currentPick: draft.currentPick,
    totalPicks: order.length,
    currentPickDeadline: draft.currentPickDeadline,
    onTheClockTeamId: draft.startedAt && !draft.completed ? order[draft.currentPick - 1] : null,
    teamNames,
    teamCount: teams.length,
    recentPicks: recentPicks.map((p) => ({
      pickNumber: p.pickNumber,
      teamName: p.team.name,
      playerName: p.player.name,
      position: p.player.position,
      isAutoPick: p.isAutoPick,
    })),
    ownRoster: ownRoster.map((r) => ({
      playerId: r.playerId,
      name: r.player.name,
      position: r.player.position,
      nflTeam: r.player.nflTeam,
    })),
  });
}
