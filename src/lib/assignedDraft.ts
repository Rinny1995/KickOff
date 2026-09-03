// Faire Zulosung ("Draft überspringen") – siehe SPEZIFIKATION.md
// Abschnitt "Faire Zulosung (auch für Nachzügler)".
//
// Prinzip: Für jede Position wird der noch freie Spielerpool nach Marktwert
// sortiert und in gleich große "Wertbänder" geteilt (bestes Band, zweitbestes
// Band, ...). Ein Team bekommt pro Positions-Slot einen zufälligen Spieler
// aus jeweils einem Band – dadurch liegt der Kader automatisch nahe am
// Schnitt des aktuellen Pools, egal ob ein Team zuerst oder als Nachzügler
// startet. Zusätzlich wird gegen den Durchschnitt der bereits zugelosten
// Teams verglichen: Wer trotzdem unter dem Schnitt liegt, bekommt die
// Differenz als Startbudget-Ausgleich.

import type { Position } from "@prisma/client";

// 16 Kaderplätze, so verteilt, dass alle Starter-Slots (siehe draft.ts)
// bequem befüllbar sind: QB 1(+1 Ersatz), RB 2(+FLEX+Ersatz), WR 2(+FLEX+
// Ersatz), TE 1(+Ersatz), K 1, DEF 1.
export const ASSIGNED_ROSTER_COMPOSITION: Record<Position, number> = {
  QB: 2,
  RB: 5,
  WR: 5,
  TE: 2,
  K: 1,
  DEF: 1,
};

export type PoolPlayer = {
  id: string;
  position: Position;
  marketValue: bigint;
};

export type AssignedPlayer = { playerId: string; position: Position; marketValue: bigint };

/**
 * Losung eines einzelnen Kaders aus dem übergebenen freien Spielerpool.
 * `pool` wird nicht verändert (Kopie intern).
 */
export function assignFairRoster(
  pool: PoolPlayer[],
  composition: Record<Position, number> = ASSIGNED_ROSTER_COMPOSITION
): AssignedPlayer[] {
  const assigned: AssignedPlayer[] = [];

  for (const position of Object.keys(composition) as Position[]) {
    const count = composition[position];
    if (count <= 0) continue;

    const available = pool
      .filter((p) => p.position === position && !assigned.some((a) => a.playerId === p.id))
      .sort((a, b) => (a.marketValue < b.marketValue ? 1 : a.marketValue > b.marketValue ? -1 : 0));

    if (available.length === 0) continue;

    const bandSize = Math.max(1, Math.ceil(available.length / count));

    for (let i = 0; i < count; i++) {
      const band = available.slice(i * bandSize, (i + 1) * bandSize);
      const candidates = band.length > 0 ? band : available.filter((p) => !assigned.some((a) => a.playerId === p.id));
      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      assigned.push({ playerId: pick.id, position: pick.position, marketValue: pick.marketValue });
    }
  }

  return assigned;
}

export function rosterTotalValue(roster: AssignedPlayer[]): bigint {
  return roster.reduce((sum, p) => sum + p.marketValue, 0n);
}

/**
 * Budget-Ausgleich: Liegt der zugeloste Kader unter dem Durchschnitt der
 * schon in der Liga zugelosten Teams, bekommt das Team die Differenz als
 * zusätzliches Startbudget. `referenceAverage` ist null beim allerersten
 * Team der Liga – dann gibt es (noch) nichts, wogegen man vergleichen kann.
 */
export function computeBudgetCompensation(
  rosterValue: bigint,
  referenceAverage: bigint | null
): bigint {
  if (referenceAverage === null) return 0n;
  if (rosterValue >= referenceAverage) return 0n;
  return referenceAverage - rosterValue;
}
