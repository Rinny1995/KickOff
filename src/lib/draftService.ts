// Snake-Draft-Orchestrierung: Terminwahl, Start, Picks, Auto-Pick bei
// Zeitablauf. Läuft wie der Transfermarkt ohne echten Hintergrund-Job –
// jede Anfrage an den Draft-Raum löst zuerst fällige Auto-Picks auf
// ("lazy resolution", siehe marketService.ts).

import { prisma } from "./prisma";
import { LEAGUE_DEFAULTS } from "./leagueDefaults";
import { buildSnakeOrder, shuffleTeams } from "./draft";
import { assignRosterToTeam } from "./leagueService";
import { ASSIGNED_ROSTER_COMPOSITION } from "./assignedDraft";
import { buildDefaultLineup } from "./lineup";
import { currentNflWeek } from "./nflWeek";
import type { Position } from "@prisma/client";

export class DraftError extends Error {}

type ProposedSlot = { id: string; at: string };
type PoolPlayer = { id: string; position: Position; marketValue: bigint };

async function getLeagueSettings(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const settings = league.settings as {
    minTeams?: number;
    pickTimeSeconds?: number;
    draftMode?: string;
  };
  return {
    league,
    minTeams: settings.minTeams ?? LEAGUE_DEFAULTS.minTeams,
    pickTimeSeconds: settings.pickTimeSeconds ?? LEAGUE_DEFAULTS.pickTimeSeconds,
  };
}

/** Legt den Draft-Datensatz einer Liga an, falls er noch nicht existiert. */
export async function ensureDraft(leagueId: string) {
  return prisma.draft.upsert({
    where: { leagueId },
    create: { leagueId },
    update: {},
  });
}

/** Gründer schlägt 1-2 Termine vor. */
export async function proposeDraftSlots(leagueId: string, founderId: string, slots: ProposedSlot[]) {
  const { league } = await getLeagueSettings(leagueId);
  if (league.founderId !== founderId) throw new DraftError("Nur der Gründer kann Termine vorschlagen");
  if (slots.length < 1 || slots.length > 2) throw new DraftError("Bitte 1 oder 2 Terminvorschläge angeben");

  const draft = await ensureDraft(leagueId);
  if (draft.startedAt) throw new DraftError("Der Draft läuft schon");

  return prisma.draft.update({
    where: { leagueId },
    data: { proposedSlots: slots, votes: {} },
  });
}

/** Ein Team stimmt für einen der vorgeschlagenen Termine (oder "none"). */
export async function voteDraftSlot(leagueId: string, teamId: string, choice: string) {
  const draft = await ensureDraft(leagueId);
  if (draft.startedAt) throw new DraftError("Der Draft läuft schon");

  const votes = { ...(draft.votes as Record<string, string>), [teamId]: choice };
  return prisma.draft.update({ where: { leagueId }, data: { votes } });
}

/** Gründer legt den finalen Termin fest (muss keiner Mehrheit folgen). */
export async function finalizeDraftSlot(leagueId: string, founderId: string, slotId: string) {
  const { league } = await getLeagueSettings(leagueId);
  if (league.founderId !== founderId) throw new DraftError("Nur der Gründer kann den Termin festlegen");

  const draft = await ensureDraft(leagueId);
  const slots = draft.proposedSlots as unknown as ProposedSlot[];
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) throw new DraftError("Unbekannter Terminvorschlag");

  return prisma.draft.update({ where: { leagueId }, data: { scheduledAt: new Date(slot.at) } });
}

/** Fair-Zulosungs-Fallback, falls die Mindest-Teamzahl nicht erreicht wird. */
export async function convertToAssigned(leagueId: string, founderId: string) {
  const { league } = await getLeagueSettings(leagueId);
  if (league.founderId !== founderId) throw new DraftError("Nur der Gründer kann den Modus wechseln");

  const draft = await ensureDraft(leagueId);
  if (draft.startedAt) throw new DraftError("Der Draft läuft schon");

  const settings = { ...(league.settings as object), draftMode: "assigned" as const };
  await prisma.league.update({ where: { id: leagueId }, data: { settings } });

  const teams = await prisma.team.findMany({ where: { leagueId } });
  for (const team of teams) {
    await assignRosterToTeam(leagueId, team.id);
  }
}

async function startDraftInternal(leagueId: string) {
  const { league, pickTimeSeconds } = await getLeagueSettings(leagueId);
  const teams = await prisma.team.findMany({ where: { leagueId } });
  const order = buildSnakeOrder(shuffleTeams(teams.map((t) => t.id)));

  await prisma.draft.update({
    where: { leagueId },
    data: {
      order,
      currentPick: 1,
      startedAt: new Date(),
      currentPickDeadline: new Date(Date.now() + pickTimeSeconds * 1000),
    },
  });
}

/** Gründer startet den Draft sofort (unabhängig vom Termin). */
export async function startDraftNow(leagueId: string, founderId: string) {
  const { league, minTeams } = await getLeagueSettings(leagueId);
  if (league.founderId !== founderId) throw new DraftError("Nur der Gründer kann den Draft starten");

  const draft = await ensureDraft(leagueId);
  if (draft.startedAt) throw new DraftError("Der Draft läuft schon");

  const teamCount = await prisma.team.count({ where: { leagueId } });
  if (teamCount < minTeams) {
    throw new DraftError(
      `Mindestens ${minTeams} Teams nötig (bisher ${teamCount}). Verschiebe den Termin oder wechsle auf Zulosung.`
    );
  }

  await startDraftInternal(leagueId);
}

function bestAvailableOverall(pool: PoolPlayer[]): PoolPlayer {
  return pool.reduce((best, p) => (p.marketValue > best.marketValue ? p : best));
}

/** Balancierte Auswahl: Position mit dem größten Rückstand zum Ziel-Kader. */
function bestAvailableForNeed(pool: PoolPlayer[], have: Partial<Record<Position, number>>): PoolPlayer {
  let bestPosition: Position | null = null;
  let worstRatio = Infinity;
  for (const pos of Object.keys(ASSIGNED_ROSTER_COMPOSITION) as Position[]) {
    const need = ASSIGNED_ROSTER_COMPOSITION[pos];
    const got = have[pos] ?? 0;
    if (got >= need) continue;
    if (!pool.some((p) => p.position === pos)) continue;
    const ratio = got / need;
    if (ratio < worstRatio) {
      worstRatio = ratio;
      bestPosition = pos;
    }
  }
  const candidates = bestPosition ? pool.filter((p) => p.position === bestPosition) : pool;
  return bestAvailableOverall(candidates);
}

/**
 * Ist dieses Team im Draft "abwesend"? Entweder hat es bei der Terminwahl
 * "kann nicht" gestimmt, oder die letzten beiden Picks liefen schon per
 * Auto-Pick. Für abwesende Teams nutzen wir den fairen, bedarfsorientierten
 * Algorithmus statt stumpf den wertvollsten verfügbaren Spieler zu ziehen.
 */
function isTeamAbsent(votes: Record<string, string>, teamId: string, recentPicksForTeam: { isAutoPick: boolean }[]) {
  if (votes[teamId] === "none") return true;
  return recentPicksForTeam.length >= 2 && recentPicksForTeam.slice(0, 2).every((p) => p.isAutoPick);
}

/**
 * Zentrale "Tick"-Funktion: startet den Draft ggf. automatisch (Termin
 * erreicht + genug Teams), löst abgelaufene Picks per Auto-Pick auf und
 * gibt den aktuellen Zustand zurück. Wird von jeder Anfrage an den
 * Draft-Raum zuerst aufgerufen.
 */
export async function tickDraft(leagueId: string) {
  const { minTeams, pickTimeSeconds } = await getLeagueSettings(leagueId);
  let draft = await ensureDraft(leagueId);

  if (!draft.startedAt && draft.scheduledAt && new Date() >= draft.scheduledAt) {
    const teamCount = await prisma.team.count({ where: { leagueId } });
    if (teamCount >= minTeams) {
      await startDraftInternal(leagueId);
      draft = await prisma.draft.findUniqueOrThrow({ where: { leagueId } });
    }
  }

  if (!draft.startedAt || draft.completed) return draft;

  const order = draft.order as unknown as string[];
  const totalPicks = order.length;

  // Solange die aktuelle Pick-Deadline schon verstrichen ist, automatisch
  // weiterziehen (kann bei langer Abwesenheit mehrere Picks am Stück sein).
  while (
    draft.startedAt &&
    !draft.completed &&
    draft.currentPickDeadline &&
    new Date() >= draft.currentPickDeadline
  ) {
    const pickNumber = draft.currentPick;
    const teamId = order[pickNumber - 1];

    const [roster, picksSoFar, votes] = await Promise.all([
      prisma.rosterSlot.findMany({ where: { teamId }, include: { player: true } }),
      prisma.draftPick.findMany({
        where: { draftId: draft.id, teamId },
        orderBy: { pickNumber: "desc" },
        take: 2,
      }),
      Promise.resolve(draft.votes as Record<string, string>),
    ]);

    const pool: PoolPlayer[] = await prisma.player.findMany({
      where: { rosterSlots: { none: { team: { leagueId } } } },
      select: { id: true, position: true, marketValue: true },
    });
    if (pool.length === 0) break; // Spielerpool leer (sollte praktisch nie passieren)

    const have: Partial<Record<Position, number>> = {};
    for (const r of roster) have[r.player.position] = (have[r.player.position] ?? 0) + 1;

    const absent = isTeamAbsent(votes, teamId, picksSoFar);
    const pick = absent ? bestAvailableForNeed(pool, have) : bestAvailableOverall(pool);

    await applyPick(draft.id, leagueId, teamId, pickNumber, pick.id, true);

    draft = await prisma.draft.findUniqueOrThrow({ where: { leagueId } });
  }

  return draft;
}

/** Ein Team zieht selbst einen Spieler. */
export async function makePick(leagueId: string, teamId: string, playerId: string) {
  const draft = await tickDraft(leagueId);
  if (!draft.startedAt) throw new DraftError("Der Draft hat noch nicht begonnen");
  if (draft.completed) throw new DraftError("Der Draft ist schon vorbei");

  const order = draft.order as unknown as string[];
  const onTheClockTeamId = order[draft.currentPick - 1];
  if (onTheClockTeamId !== teamId) throw new DraftError("Du bist gerade nicht an der Reihe");

  const alreadyTaken = await prisma.rosterSlot.findFirst({
    where: { playerId, team: { leagueId } },
  });
  if (alreadyTaken) throw new DraftError("Dieser Spieler ist schon vergeben");

  await applyPick(draft.id, leagueId, teamId, draft.currentPick, playerId, false);
}

async function applyPick(
  draftId: string,
  leagueId: string,
  teamId: string,
  pickNumber: number,
  playerId: string,
  isAutoPick: boolean
) {
  const [player, league] = await Promise.all([
    prisma.player.findUniqueOrThrow({ where: { id: playerId } }),
    prisma.league.findUniqueOrThrow({ where: { id: leagueId } }),
  ]);
  const { pickTimeSeconds } = await getLeagueSettings(leagueId);

  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  const order = draft.order as unknown as string[];
  const isLastPick = pickNumber >= order.length;

  await prisma.$transaction([
    prisma.draftPick.create({
      data: { draftId, pickNumber, teamId, playerId, isAutoPick },
    }),
    prisma.rosterSlot.create({
      data: { teamId, playerId, boughtAt: player.marketValue },
    }),
    prisma.draft.update({
      where: { id: draftId },
      data: isLastPick
        ? { completed: true, currentPick: pickNumber + 1, currentPickDeadline: null }
        : {
            currentPick: pickNumber + 1,
            currentPickDeadline: new Date(Date.now() + pickTimeSeconds * 1000),
          },
    }),
  ]);

  if (isLastPick) {
    await finishDraft(leagueId, league.season);
  }
}

/** Erzeugt für jedes Team eine Start-Aufstellung, sobald der Draft komplett ist. */
async function finishDraft(leagueId: string, season: number) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: { roster: { include: { player: true } } },
  });
  const week = currentNflWeek(season);

  for (const team of teams) {
    const existing = await prisma.lineup.findUnique({
      where: { teamId_season_week: { teamId: team.id, season, week } },
    });
    if (existing) continue;
    const slots = buildDefaultLineup(
      team.roster.map((r) => ({
        playerId: r.playerId,
        position: r.player.position,
        marketValue: r.player.marketValue,
      }))
    );
    await prisma.lineup.create({ data: { teamId: team.id, season, week, slots } });
  }
}
