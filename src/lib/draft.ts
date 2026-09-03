// Snake-Draft & Kader-Regeln der KickOff.

export const ROSTER_RULES = {
  starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 }, // 9 Starter
  benchSize: 7,
  irSize: 2,
  totalRounds: 16, // 9 Starter + 7 Bank werden gedraftet, IR bleibt leer
  flexPositions: ["RB", "WR", "TE"] as const,
};

// Die 9 Starter-Slots einer Aufstellung, in Anzeige-Reihenfolge.
export const STARTER_SLOTS = [
  "QB",
  "RB1",
  "RB2",
  "WR1",
  "WR2",
  "TE",
  "FLEX",
  "K",
  "DEF",
] as const;

/** Zu welcher Basis-Position gehört ein Slot ("RB1" -> "RB", "FLEX" bleibt "FLEX"). */
export function slotBasePosition(slot: string): string {
  return slot.replace(/\d+$/, "");
}

/** Darf ein Spieler dieser Position in diesen Slot? */
export function isEligibleForSlot(slot: string, position: string): boolean {
  const base = slotBasePosition(slot);
  return base === "FLEX"
    ? (ROSTER_RULES.flexPositions as readonly string[]).includes(position)
    : position === base;
}

/**
 * Erzeugt die komplette Snake-Reihenfolge.
 * Runde 1: Team 1 → N, Runde 2: Team N → 1, usw.
 * @param teamIds  Team-IDs in (gemischter) Erstrunden-Reihenfolge
 */
export function buildSnakeOrder(teamIds: string[], rounds = ROSTER_RULES.totalRounds): string[] {
  const order: string[] = [];
  for (let r = 0; r < rounds; r++) {
    const roundOrder = r % 2 === 0 ? teamIds : [...teamIds].reverse();
    order.push(...roundOrder);
  }
  return order;
}

/** Mischt die Erstrunden-Reihenfolge fair per Fisher-Yates. */
export function shuffleTeams(teamIds: string[]): string[] {
  const arr = [...teamIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Prüft, ob eine Aufstellung gültig ist.
 * slots: { QB: playerId, RB1: ..., RB2: ..., WR1: ..., WR2: ..., TE: ..., FLEX: ..., K: ..., DEF: ... }
 */
export function validateLineup(
  slots: Record<string, string>,
  playerPositions: Record<string, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const slot of STARTER_SLOTS) {
    const playerId = slots[slot];
    if (!playerId) {
      errors.push(`Slot ${slot} ist nicht besetzt`);
      continue;
    }
    const pos = playerPositions[playerId];
    if (!isEligibleForSlot(slot, pos)) {
      errors.push(`${slot}: Spieler hat Position ${pos}, erlaubt ist das nicht`);
    }
  }

  const ids = Object.values(slots).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    errors.push("Ein Spieler kann nur einen Slot besetzen");
  }

  return { valid: errors.length === 0, errors };
}
