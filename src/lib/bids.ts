// Transfermarkt-Logik: verdeckte Gebote mit Frist.
// Ein Hintergrund-Job ruft resolveBids() auf, sobald eine Deadline abläuft.

export type BidInput = {
  bidId: string;
  teamId: string;
  amount: bigint;      // Cent
  teamBudget: bigint;  // aktuelles Budget des bietenden Teams
  createdAt: Date;
};

export type BidResolution = {
  winnerBidId: string | null;
  price: bigint | null;
  reason: "highest_bid" | "no_valid_bids";
};

/**
 * Regeln:
 * 1. Nur Gebote >= Mindestpreis und <= Team-Budget sind gültig.
 * 2. Das höchste gültige Gebot gewinnt und zahlt exakt seinen Gebotsbetrag
 *    (klassisches Comunio-Prinzip: wer hoch pokert, zahlt hoch).
 * 3. Bei Gleichstand gewinnt das früher abgegebene Gebot.
 */
export function resolveBids(bids: BidInput[], minPrice: bigint): BidResolution {
  const valid = bids.filter(b => b.amount >= minPrice && b.amount <= b.teamBudget);

  if (valid.length === 0) {
    return { winnerBidId: null, price: null, reason: "no_valid_bids" };
  }

  valid.sort((a, b) => {
    if (a.amount !== b.amount) return a.amount > b.amount ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return { winnerBidId: valid[0].bidId, price: valid[0].amount, reason: "highest_bid" };
}
