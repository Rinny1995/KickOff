// Baut eine sinnvolle Start-Aufstellung aus einem frisch zugelosten Kader,
// damit "Mein Team" nie leer ist. Der Nutzer kann danach jederzeit tauschen.

import { STARTER_SLOTS, isEligibleForSlot } from "./draft";
import type { Position } from "@prisma/client";

export type RosterPlayer = {
  playerId: string;
  position: Position;
  marketValue: bigint;
};

/** Bestbesetzte Aufstellung nach Marktwert – ein einfacher, aber fairer Startpunkt. */
export function buildDefaultLineup(roster: RosterPlayer[]): Record<string, string> {
  const remaining = [...roster].sort((a, b) => (a.marketValue < b.marketValue ? 1 : -1));
  const slots: Record<string, string> = {};

  for (const slot of STARTER_SLOTS) {
    const idx = remaining.findIndex((p) => isEligibleForSlot(slot, p.position));
    if (idx === -1) continue;
    slots[slot] = remaining[idx].playerId;
    remaining.splice(idx, 1);
  }

  return slots;
}
