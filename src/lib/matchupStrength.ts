// Matchup-Ampel (siehe SPEZIFIKATION.md): pro NFL-Defense der laufende
// Schnitt der an jede Position abgegebenen Fantasy-Punkte, verglichen mit
// dem Liga-Durchschnitt. Braucht echte, bereits gespielte Wochen – vor
// Saisonbeginn (oder in Woche 1) liefert das noch keine Bewertungen, das
// ist so gewollt (keine Rate-Ampel ohne echte Datenbasis).

import { prisma } from "./prisma";
import { calculatePoints, DEFAULT_SCORING } from "./scoring";
import type { Position } from "@prisma/client";

const RATED_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K"];

export type DefenseStrength = {
  perTeam: Record<string, Partial<Record<Position, number>>>; // Team -> Position -> Punkteschnitt/Spiel
  leagueAvg: Partial<Record<Position, number>>; // Liga-Durchschnitt je Position
};

/** Berechnet die Matchup-Stärke aller NFL-Defenses aus bereits gespielten Wochen. */
export async function computeDefenseStrength(season: number, beforeWeek: number): Promise<DefenseStrength> {
  const completedWeeks = Array.from({ length: Math.max(0, beforeWeek - 1) }, (_, i) => i + 1);
  if (completedWeeks.length === 0) return { perTeam: {}, leagueAvg: {} };

  const [games, stats] = await Promise.all([
    prisma.nflGame.findMany({ where: { season, week: { in: completedWeeks } } }),
    prisma.playerGameStats.findMany({
      where: { season, week: { in: completedWeeks } },
      include: { player: { select: { position: true, nflTeam: true } } },
    }),
  ]);
  if (games.length === 0) return { perTeam: {}, leagueAvg: {} };

  // Woche -> NFL-Team -> Position -> abgegebene Punkte dieser Woche
  const byWeekTeamPos = new Map<number, Map<string, Partial<Record<Position, number>>>>();
  for (const s of stats) {
    const pos = s.player.position;
    if (!RATED_POSITIONS.includes(pos)) continue;
    const points = calculatePoints(s, DEFAULT_SCORING);
    const teamMap = byWeekTeamPos.get(s.week) ?? new Map();
    const posMap = teamMap.get(s.player.nflTeam) ?? {};
    posMap[pos] = (posMap[pos] ?? 0) + points;
    teamMap.set(s.player.nflTeam, posMap);
    byWeekTeamPos.set(s.week, teamMap);
  }

  const sumAllowed: Record<string, Partial<Record<Position, number>>> = {};
  const gamesCounted: Record<string, number> = {};
  const leagueSum: Partial<Record<Position, number>> = {};
  const leagueGames: Partial<Record<Position, number>> = {};

  for (const game of games) {
    const teamMap = byWeekTeamPos.get(game.week);
    const matchups: [string, string][] = [
      [game.homeTeam, game.awayTeam],
      [game.awayTeam, game.homeTeam],
    ];
    for (const [defenseTeam, offenseTeam] of matchups) {
      gamesCounted[defenseTeam] = (gamesCounted[defenseTeam] ?? 0) + 1;
      const offensePos = teamMap?.get(offenseTeam);
      if (!offensePos) continue;
      sumAllowed[defenseTeam] ??= {};
      for (const pos of RATED_POSITIONS) {
        const pts = offensePos[pos] ?? 0;
        sumAllowed[defenseTeam][pos] = (sumAllowed[defenseTeam][pos] ?? 0) + pts;
        leagueSum[pos] = (leagueSum[pos] ?? 0) + pts;
        leagueGames[pos] = (leagueGames[pos] ?? 0) + 1;
      }
    }
  }

  const perTeam: DefenseStrength["perTeam"] = {};
  for (const team of Object.keys(gamesCounted)) {
    const played = gamesCounted[team];
    if (played === 0) continue;
    perTeam[team] = {};
    for (const pos of RATED_POSITIONS) {
      perTeam[team]![pos] = (sumAllowed[team]?.[pos] ?? 0) / played;
    }
  }

  const leagueAvg: DefenseStrength["leagueAvg"] = {};
  for (const pos of RATED_POSITIONS) {
    const g = leagueGames[pos];
    if (g) leagueAvg[pos] = (leagueSum[pos] ?? 0) / g;
  }

  return { perTeam, leagueAvg };
}

export type MatchupRating = "easy" | "hard" | "neutral";

/** null = noch nicht genug Daten (z.B. Saisonstart) -> keine Ampel anzeigen. */
export function rateMatchup(
  strength: DefenseStrength,
  opponentTeam: string,
  position: Position
): MatchupRating | null {
  const allowed = strength.perTeam[opponentTeam]?.[position];
  const avg = strength.leagueAvg[position];
  if (allowed === undefined || !avg) return null;
  const ratio = allowed / avg;
  if (ratio >= 1.1) return "easy";
  if (ratio <= 0.9) return "hard";
  return "neutral";
}
