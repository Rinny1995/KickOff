// Grobe Wochen-Berechnung, bis der echte NFL-Spielplan angebunden ist
// (Gegner, Anstoßzeiten, Bye Weeks – siehe SPEZIFIKATION.md Abschnitt 5).
// Die Saison startet üblicherweise am ersten Donnerstag nach Labor Day
// (erster Montag im September).

const REGULAR_SEASON_WEEKS = 18;

function firstThursdayAfterLaborDay(year: number): Date {
  // Labor Day = erster Montag im September
  const sept1 = new Date(Date.UTC(year, 8, 1));
  const dayOfWeek = sept1.getUTCDay(); // 0 = Sonntag
  const daysToMonday = (8 - dayOfWeek) % 7;
  const laborDay = new Date(Date.UTC(year, 8, 1 + daysToMonday));
  const kickoffThursday = new Date(laborDay);
  kickoffThursday.setUTCDate(laborDay.getUTCDate() + 3);
  return kickoffThursday;
}

/** Aktuelle NFL-Woche (1–18) für eine Saison, geschätzt anhand des Datums. */
export function currentNflWeek(season: number, now: Date = new Date()): number {
  const start = firstThursdayAfterLaborDay(season);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(REGULAR_SEASON_WEEKS, Math.max(1, week));
}

// Regular Season (18 Wochen) + Puffer für Playoffs/Super Bowl, bevor eine
// Liga in die nächste Saison starten darf – sonst könnte jemand mitten in
// der laufenden Saison aus Versehen alles zurücksetzen.
const SEASON_END_BUFFER_WEEKS = REGULAR_SEASON_WEEKS + 4;

/** Darf die Liga in die nächste Saison starten (Reset von Kader & Budget)? */
export function canStartNewSeason(season: number, now: Date = new Date()): boolean {
  const start = firstThursdayAfterLaborDay(season);
  const seasonEnd = new Date(start);
  seasonEnd.setUTCDate(start.getUTCDate() + SEASON_END_BUFFER_WEEKS * 7);
  return now >= seasonEnd;
}

/**
 * Die reale, laufende NFL-Saison (unabhängig von einer einzelnen Liga) –
 * für den täglichen Cron-Job, der Spielplan/Stats/Marktwerte aktuell hält.
 * Vor September zählt noch die vorherige Saison (Playoffs/Offseason).
 */
export function currentNflSeason(now: Date = new Date()): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? year : year - 1; // Monat 7 = August
}
