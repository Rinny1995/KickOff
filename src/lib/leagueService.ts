// Serverseitige Liga-Logik: Liga anlegen, beitreten, faire Zulosung
// durchführen. Baut auf src/lib/assignedDraft.ts (reine Zulosungs-Regeln)
// und src/lib/leagueDefaults.ts (Standard-Einstellungen) auf.

import { prisma } from "./prisma";
import { LEAGUE_DEFAULTS } from "./leagueDefaults";
import {
  ASSIGNED_ROSTER_COMPOSITION,
  assignFairRoster,
  computeBudgetCompensation,
  rosterTotalValue,
  type PoolPlayer,
} from "./assignedDraft";
import { buildDefaultLineup } from "./lineup";
import { currentNflWeek, canStartNewSeason } from "./nflWeek";
import { syncPlayerPool } from "./nflSync";

/**
 * Legt den Kader eines frisch beigetretenen Teams per fairer Zulosung an
 * und schreibt das (ggf. per Ausgleich erhöhte) Startbudget.
 * Nur für Ligen mit draftMode "assigned" – bei "snake" bleibt der Kader
 * leer, bis der Draft-Raum (kommt später) ihn befüllt.
 */
export async function assignRosterToTeam(leagueId: string, teamId: string) {
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: leagueId },
    select: { season: true },
  });

  const pool: PoolPlayer[] = await prisma.player.findMany({
    where: { rosterSlots: { none: { team: { leagueId } } } },
    select: { id: true, position: true, marketValue: true },
  });

  const assigned = assignFairRoster(pool, ASSIGNED_ROSTER_COMPOSITION);
  const rosterValue = rosterTotalValue(assigned);

  // Durchschnitt der bereits zugelosten Teams dieser Liga (für den
  // Nachzügler-Ausgleich). Eigenes Team ist noch nicht dabei, also einfach
  // über alle bestehenden RosterSlots dieser Liga mitteln.
  const existingTeams = await prisma.team.findMany({
    where: { leagueId, id: { not: teamId }, roster: { some: {} } },
    select: { roster: { select: { boughtAt: true } } },
  });

  let referenceAverage: bigint | null = null;
  if (existingTeams.length > 0) {
    const totals = existingTeams.map((t) => t.roster.reduce((s, r) => s + r.boughtAt, 0n));
    referenceAverage = totals.reduce((s, v) => s + v, 0n) / BigInt(totals.length);
  }

  const compensation = computeBudgetCompensation(rosterValue, referenceAverage);
  const startBudget = BigInt(LEAGUE_DEFAULTS.startBudgetCents);
  const week = currentNflWeek(league.season);
  const defaultSlots = buildDefaultLineup(assigned);

  await prisma.$transaction([
    prisma.rosterSlot.createMany({
      data: assigned.map((p) => ({
        teamId,
        playerId: p.playerId,
        boughtAt: p.marketValue,
      })),
    }),
    prisma.team.update({
      where: { id: teamId },
      data: { budget: startBudget + compensation },
    }),
    prisma.lineup.create({
      data: { teamId, season: league.season, week, slots: defaultSlots },
    }),
  ]);

  return { rosterValue, compensation };
}

export class LeagueError extends Error {}

/**
 * Saisonwechsel: Kader & Budget aller Teams werden zurückgesetzt (Comunio-
 * Prinzip – jede Saison ein neues Rennen), der Spielerpool wird aufgefrischt
 * (neue Rookies), und bei "assigned"-Ligen bekommt jedes Team sofort wieder
 * einen fair zugelosten Kader. Alte Saison-Daten (Punkte, Tabelle,
 * Marktwert-Verlauf) bleiben unangetastet – die sind schon pro Saison
 * gespeichert und werden hier nicht gelöscht.
 * Bei "snake"-Ligen bleibt der Kader danach leer, bis ein neuer Draft
 * stattfindet (Draft-Raum kommt später).
 */
export async function startNewSeason(leagueId: string, userId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  if (league.founderId !== userId) {
    throw new LeagueError("Nur der Gründer kann eine neue Saison starten");
  }
  if (!canStartNewSeason(league.season)) {
    throw new LeagueError("Die laufende Saison ist noch nicht vorbei");
  }

  await syncPlayerPool();

  const settings = league.settings as { startBudgetCents?: string; draftMode?: "snake" | "assigned" };
  const startBudget = BigInt(settings.startBudgetCents ?? LEAGUE_DEFAULTS.startBudgetCents);
  const newSeason = league.season + 1;

  const teams = await prisma.team.findMany({ where: { leagueId } });

  await prisma.$transaction([
    prisma.rosterSlot.deleteMany({ where: { team: { leagueId } } }),
    prisma.watchlistEntry.deleteMany({ where: { team: { leagueId } } }),
    ...teams.map((t) => prisma.team.update({ where: { id: t.id }, data: { budget: startBudget } })),
    prisma.league.update({ where: { id: leagueId }, data: { season: newSeason } }),
  ]);

  if (settings.draftMode === "assigned") {
    for (const team of teams) {
      await assignRosterToTeam(leagueId, team.id);
    }
  }

  return { newSeason };
}

/** Das eigene Team des Nutzers in dieser Liga, oder null. */
export async function getOwnTeamInLeague(userId: string, leagueId: string) {
  return prisma.team.findUnique({
    where: { userId_leagueId: { userId, leagueId } },
  });
}

export function buildLeagueSettings(overrides: { draftMode: "snake" | "assigned" }) {
  return {
    ...LEAGUE_DEFAULTS,
    draftMode: overrides.draftMode,
  };
}
