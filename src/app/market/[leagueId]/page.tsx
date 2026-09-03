import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { resolveExpiredListings } from "@/lib/marketService";
import { MarketClient, type ListingView, type WatchedPlayerView } from "@/components/MarketClient";

export default async function MarketPage({ params }: { params: { leagueId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ownTeam = await getOwnTeamInLeague(user.id, params.leagueId);
  if (!ownTeam) redirect("/dashboard");

  await resolveExpiredListings(params.leagueId);

  // Frisch nachladen: die Auflösung oben kann das eigene Budget gerade
  // verändert haben (gewonnenes oder verkauftes Gebot).
  const team = await prisma.team.findUniqueOrThrow({ where: { id: ownTeam.id } });

  const [listings, watchlist, league] = await Promise.all([
    prisma.listing.findMany({
      where: { leagueId: params.leagueId, resolved: false },
      include: {
        player: true,
        sellerTeam: { select: { name: true } },
        bids: { where: { teamId: team.id } },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.watchlistEntry.findMany({
      where: { teamId: team.id },
      include: { player: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.league.findUniqueOrThrow({ where: { id: params.leagueId }, select: { name: true } }),
  ]);

  const watchedIds = new Set(watchlist.map((w) => w.playerId));

  const listingViews: ListingView[] = listings.map((l) => ({
    id: l.id,
    playerId: l.playerId,
    playerName: l.player.name,
    position: l.player.position,
    nflTeam: l.player.nflTeam,
    status: l.player.status,
    minPriceCents: l.minPrice.toString(),
    deadline: l.deadline.toISOString(),
    sellerLabel: l.sellerTeam?.name ?? "Computer",
    ownBidCents: l.bids[0] ? l.bids[0].amount.toString() : null,
    watched: watchedIds.has(l.playerId),
  }));

  const watchlistViews: WatchedPlayerView[] = watchlist.map((w) => ({
    playerId: w.playerId,
    name: w.player.name,
    position: w.player.position,
    marketValueCents: w.player.marketValue.toString(),
  }));

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <div>
          <Link href="/dashboard" className="text-sm text-subtitle">
            ← Zurück
          </Link>
          <h1 className="text-xl font-bold text-white">Transfermarkt</h1>
          <p className="flex items-center gap-2 text-sm text-subtitle">
            {league.name} ·{" "}
            <span className="font-semibold text-ball-green">
              {(Number(team.budget) / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })}{" "}
              Budget
            </span>
          </p>
        </div>

        <MarketClient
          leagueId={params.leagueId}
          budgetCents={team.budget.toString()}
          initialListings={listingViews}
          initialWatchlist={watchlistViews}
        />
      </div>
    </main>
  );
}
