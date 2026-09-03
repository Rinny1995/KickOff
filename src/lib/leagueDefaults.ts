// Standard-Einstellungen für neue Ligen.
// Alles hier landet als JSON in League.settings und ist pro Liga anpassbar.

import { DEFAULT_SCORING } from "./scoring";
import { DEFAULT_MARKET } from "./marketValue";

export const LEAGUE_DEFAULTS = {
  scoring: DEFAULT_SCORING,
  market: {
    formWeight: DEFAULT_MARKET.formWeight,
    baselinePoints: DEFAULT_MARKET.baselinePoints,
    maxWeeklyChange: DEFAULT_MARKET.maxWeeklyChange,
  },
  // Startbudget: 40 Mio (in Cent) – genug für einen soliden Kader,
  // knapp genug, dass Budget-Entscheidungen wehtun.
  startBudgetCents: "4000000000",
  // Wochenprämien nach Platzierung (in Cent): 1. bis 3. Platz
  weeklyPrizesCents: ["100000000", "50000000", "25000000"], // 1 Mio / 500k / 250k
  traderMonthlyPrizeCents: "75000000", // 750k für die beste Wertentwicklung des Monats
  minTeams: 4,
  maxTeams: 12,
  // Gebots-Fristen: neue Markt-Angebote laufen 24h
  listingDurationHours: 24,
  // "snake" = Draft-Raum mit Terminwahl, "assigned" = sofortige faire Zulosung
  draftMode: "assigned" as "snake" | "assigned",
  pickTimeSeconds: 60,
  lineupLock: "first_kickoff" as const,
};
