// Punkteberechnung – Half PPR, wie im Balance-Tester abgestimmt.
// Alle Gewichte liegen in der Liga-Konfiguration und sind pro Liga anpassbar.

export type ScoringConfig = {
  passYardsPerPoint: number;   // 25
  passTd: number;              // 4
  interception: number;        // -2
  rushRecYardsPerPoint: number;// 10
  rushRecTd: number;           // 6
  reception: number;           // 0.5 (Half PPR)
  fumbleLost: number;          // -2
  fgMade: number;              // 3
  fgMissed: number;            // -1
  xpMade: number;              // 1
  defSack: number;             // 1
  defInt: number;              // 2
  defTd: number;               // 6
};

export const DEFAULT_SCORING: ScoringConfig = {
  passYardsPerPoint: 25,
  passTd: 4,
  interception: -2,
  rushRecYardsPerPoint: 10,
  rushRecTd: 6,
  reception: 0.5,
  fumbleLost: -2,
  fgMade: 3,
  fgMissed: -1,
  xpMade: 1,
  defSack: 1,
  defInt: 2,
  defTd: 6,
};

export type GameStats = {
  passYards: number; passTds: number; interceptions: number;
  rushYards: number; rushTds: number;
  recYards: number; recTds: number; receptions: number;
  fumblesLost: number;
  fgMade: number; fgMissed: number; xpMade: number;
  defSacks: number; defInts: number; defTds: number; defPointsAllowed: number;
};

// Gestaffelte Defense-Punkte nach zugelassenen Gegner-Punkten
function defPointsAllowedScore(pa: number): number {
  if (pa === 0) return 10;
  if (pa <= 6) return 7;
  if (pa <= 13) return 4;
  if (pa <= 20) return 1;
  if (pa <= 27) return 0;
  if (pa <= 34) return -1;
  return -4;
}

export function calculatePoints(stats: GameStats, cfg: ScoringConfig = DEFAULT_SCORING): number {
  let pts = 0;
  pts += stats.passYards / cfg.passYardsPerPoint;
  pts += stats.passTds * cfg.passTd;
  pts += stats.interceptions * cfg.interception;
  pts += (stats.rushYards + stats.recYards) / cfg.rushRecYardsPerPoint;
  pts += (stats.rushTds + stats.recTds) * cfg.rushRecTd;
  pts += stats.receptions * cfg.reception;
  pts += stats.fumblesLost * cfg.fumbleLost;
  pts += stats.fgMade * cfg.fgMade;
  pts += stats.fgMissed * cfg.fgMissed;
  pts += stats.xpMade * cfg.xpMade;
  pts += stats.defSacks * cfg.defSack;
  pts += stats.defInts * cfg.defInt;
  pts += stats.defTds * cfg.defTd;
  if (stats.defSacks > 0 || stats.defInts > 0 || stats.defTds > 0 || stats.defPointsAllowed > 0) {
    pts += defPointsAllowedScore(stats.defPointsAllowed);
  }
  // Auf eine Nachkommastelle runden, damit die Anzeige sauber bleibt
  return Math.round(pts * 10) / 10;
}
