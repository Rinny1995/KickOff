// Marktwert-Engine – läuft als nächtlicher Hintergrund-Job.
// Formel wie im Balance-Tester: gewichteter Mix aus Form und Nachfrage,
// wöchentliche Änderung auf ±10 % gedeckelt.

export type MarketConfig = {
  formWeight: number;        // 0.6 = 60 % Form, 40 % Nachfrage
  baselinePoints: number;    // 12 = "durchschnittliche" Wochenleistung
  maxWeeklyChange: number;   // 0.10 = ±10 % pro Woche
  minValueCents: bigint;     // Untergrenze, z.B. 100_000_00n (100.000 €)
};

export const DEFAULT_MARKET: MarketConfig = {
  formWeight: 0.6,
  baselinePoints: 12,
  maxWeeklyChange: 0.1,
  minValueCents: 10_000_000n, // 100.000 € in Cent
};

/**
 * Berechnet den neuen Tageswert eines Spielers.
 * @param currentValue  aktueller Wert in Cent
 * @param avgPoints     Punkteschnitt der letzten 3 Spiele
 * @param demandScore   0–100: Anteil der Ligen, in denen auf den Spieler geboten wurde
 */
export function nextDailyValue(
  currentValue: bigint,
  avgPoints: number,
  demandScore: number,
  cfg: MarketConfig = DEFAULT_MARKET
): bigint {
  const formFactor = (avgPoints - cfg.baselinePoints) / cfg.baselinePoints;
  const demandFactor = (demandScore - 50) / 50;

  let weeklyChange =
    (formFactor * cfg.formWeight + demandFactor * (1 - cfg.formWeight)) *
    (cfg.maxWeeklyChange * 0.6);

  weeklyChange = Math.max(-cfg.maxWeeklyChange, Math.min(cfg.maxWeeklyChange, weeklyChange));

  // Wochenänderung auf 7 Tageschritte verteilen
  const dailyChange = Math.pow(1 + weeklyChange, 1 / 7) - 1;

  // BigInt-sichere Prozentrechnung über Basispunkte (1/10000)
  const bps = BigInt(Math.round(dailyChange * 10_000));
  let next = currentValue + (currentValue * bps) / 10_000n;

  if (next < cfg.minValueCents) next = cfg.minValueCents;
  return next;
}
