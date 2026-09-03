// Transfermarkt-Logik: Angebote erzeugen, Gebote abgeben, abgelaufene
// Angebote auflösen. Baut auf der reinen Regel-Logik in src/lib/bids.ts auf.
//
// Es läuft (noch) kein eigener Hintergrund-Job – stattdessen löst jede
// Markt-Anfrage zuerst kurz alle abgelaufenen Angebote dieser Liga auf
// ("lazy resolution"). Das reicht für V1 und ist einfach zu testen; ein
// echter Cron-Job (z.B. Vercel Cron) kann später dieselbe Funktion aufrufen.

import { prisma } from "./prisma";
import { LEAGUE_DEFAULTS } from "./leagueDefaults";
import { resolveBids, type BidInput } from "./bids";
import { ROSTER_RULES } from "./draft";

// 9 Starter + 7 Bank + 2 IR = 18 Kaderplätze insgesamt.
const MAX_ROSTER_SIZE = 9 + ROSTER_RULES.benchSize + ROSTER_RULES.irSize;

// So viele Spieler braucht ein Team mindestens, um seine Startelf überhaupt
// befüllen zu können (QB+2RB+2WR+TE+FLEX+K+DEF = 9). Verkäufe, die den
// Kader darunter drücken würden, sind gesperrt – sonst könnte ein Team
// fast den ganzen Kader verkaufen, nur um sich einen einzigen Star zu
// kaufen.
const MIN_ROSTER_SIZE = Object.values(ROSTER_RULES.starters).reduce((a, b) => a + b, 0);

export class MarketError extends Error {}

/** Löst alle abgelaufenen, noch offenen Angebote einer Liga auf. */
export async function resolveExpiredListings(leagueId: string): Promise<void> {
  const dueIds = await prisma.listing.findMany({
    where: { leagueId, resolved: false, deadline: { lte: new Date() } },
    orderBy: { deadline: "asc" },
    select: { id: true },
  });

  // Jedes Angebot einzeln und mit frisch geladenem Team-Budget auflösen:
  // Gewinnt ein Team ein früheres Angebot, muss der ausgegebene Betrag beim
  // nächsten Angebot bereits vom Budget abgezogen sein (sonst könnte ein
  // Team mehr gewinnen, als sein Budget insgesamt hergibt).
  for (const { id } of dueIds) {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { bids: { include: { team: true } } },
    });
    if (!listing || listing.resolved) continue;

    const bidInputs: BidInput[] = listing.bids.map((b) => ({
      bidId: b.id,
      teamId: b.teamId,
      amount: b.amount,
      teamBudget: b.team.budget,
      createdAt: b.createdAt,
    }));

    const result = resolveBids(bidInputs, listing.minPrice);

    if (!result.winnerBidId || result.price === null) {
      await prisma.listing.update({ where: { id: listing.id }, data: { resolved: true } });
      continue;
    }

    const winningBid = listing.bids.find((b) => b.id === result.winnerBidId)!;

    await prisma.$transaction([
      // Käufer zahlt und bekommt den Spieler.
      prisma.team.update({
        where: { id: winningBid.teamId },
        data: { budget: { decrement: result.price } },
      }),
      prisma.rosterSlot.upsert({
        where: { teamId_playerId: { teamId: winningBid.teamId, playerId: listing.playerId } },
        create: { teamId: winningBid.teamId, playerId: listing.playerId, boughtAt: result.price },
        update: { boughtAt: result.price },
      }),
      // Verkäufer (falls kein Computer) bekommt den Erlös und verliert den Spieler.
      ...(listing.sellerTeamId
        ? [
            prisma.team.update({
              where: { id: listing.sellerTeamId },
              data: { budget: { increment: result.price } },
            }),
            prisma.rosterSlot.deleteMany({
              where: { teamId: listing.sellerTeamId, playerId: listing.playerId },
            }),
          ]
        : []),
      prisma.bid.update({ where: { id: winningBid.id }, data: { won: true } }),
      prisma.listing.update({ where: { id: listing.id }, data: { resolved: true } }),
    ]);
  }
}

/**
 * Gebot abgeben oder erhöhen. Für Spieler ohne aktives Angebot ("freier
 * Markt") wird automatisch ein neues Angebot vom Computer eröffnet –
 * genau wie bei Comunio reicht das erste Gebot, um den Spieler ins
 * Bieterverfahren zu bringen.
 */
export async function placeBid(leagueId: string, teamId: string, playerId: string, amount: bigint) {
  await resolveExpiredListings(leagueId);

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { roster: true },
  });
  if (team.leagueId !== leagueId) throw new MarketError("Team gehört nicht zu dieser Liga");
  if (amount > team.budget) throw new MarketError("Gebot übersteigt dein Budget");
  if (amount <= 0n) throw new MarketError("Gebot muss größer als 0 sein");

  const alreadyOwned = team.roster.some((r) => r.playerId === playerId);
  if (alreadyOwned) throw new MarketError("Dieser Spieler ist schon in deinem Kader");

  let listing = await prisma.listing.findFirst({
    where: { leagueId, playerId, resolved: false },
  });

  if (!listing) {
    const rosteredElsewhere = await prisma.rosterSlot.findFirst({
      where: { playerId, team: { leagueId } },
    });
    const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
    const settings = await getLeagueSettings(leagueId);

    if (rosteredElsewhere) {
      throw new MarketError(
        "Dieser Spieler gehört einem anderen Team und steht nicht zum Verkauf"
      );
    }
    if (team.roster.length >= MAX_ROSTER_SIZE) {
      throw new MarketError(`Kader ist voll (max. ${MAX_ROSTER_SIZE} Spieler)`);
    }

    listing = await prisma.listing.create({
      data: {
        leagueId,
        playerId,
        sellerTeamId: null,
        minPrice: player.marketValue,
        deadline: new Date(Date.now() + settings.listingDurationHours * 60 * 60 * 1000),
      },
    });
  } else if (listing.sellerTeamId !== teamId && team.roster.length >= MAX_ROSTER_SIZE) {
    throw new MarketError(`Kader ist voll (max. ${MAX_ROSTER_SIZE} Spieler)`);
  }

  if (amount < listing.minPrice) {
    throw new MarketError("Gebot liegt unter dem Mindestpreis");
  }
  if (listing.sellerTeamId === teamId) {
    throw new MarketError("Du kannst nicht auf deinen eigenen Spieler bieten");
  }

  await prisma.bid.upsert({
    where: { listingId_teamId: { listingId: listing.id, teamId } },
    create: { listingId: listing.id, teamId, amount },
    update: { amount },
  });

  return listing.id;
}

/** Eigenen Spieler zum Verkauf anbieten. */
export async function createSaleListing(
  leagueId: string,
  teamId: string,
  playerId: string,
  minPrice: bigint
) {
  await resolveExpiredListings(leagueId);

  const rosterSlot = await prisma.rosterSlot.findUnique({
    where: { teamId_playerId: { teamId, playerId } },
  });
  if (!rosterSlot) throw new MarketError("Spieler gehört nicht zu deinem Kader");
  if (minPrice <= 0n) throw new MarketError("Mindestpreis muss größer als 0 sein");

  const existing = await prisma.listing.findFirst({
    where: { leagueId, playerId, resolved: false },
  });
  if (existing) throw new MarketError("Für diesen Spieler läuft schon ein Angebot");

  // Verkäufe dürfen den Kader nicht unter die Mindestgröße drücken – sonst
  // könnte ein Team fast alles verkaufen, um sich einen Star zu leisten.
  const [rosterCount, activeSaleCount] = await Promise.all([
    prisma.rosterSlot.count({ where: { teamId } }),
    prisma.listing.count({ where: { leagueId, sellerTeamId: teamId, resolved: false } }),
  ]);
  if (rosterCount - activeSaleCount - 1 < MIN_ROSTER_SIZE) {
    throw new MarketError(
      `Kader würde unter die Mindestgröße von ${MIN_ROSTER_SIZE} Spielern fallen – bitte zuerst weniger gleichzeitig anbieten oder erst kaufen`
    );
  }

  const settings = await getLeagueSettings(leagueId);

  return prisma.listing.create({
    data: {
      leagueId,
      playerId,
      sellerTeamId: teamId,
      minPrice,
      deadline: new Date(Date.now() + settings.listingDurationHours * 60 * 60 * 1000),
    },
  });
}

async function getLeagueSettings(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: leagueId },
    select: { settings: true },
  });
  const settings = league.settings as { listingDurationHours?: number };
  return { listingDurationHours: settings.listingDurationHours ?? LEAGUE_DEFAULTS.listingDurationHours };
}
