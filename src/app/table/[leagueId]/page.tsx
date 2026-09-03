import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { currentNflWeek } from "@/lib/nflWeek";
import { TableClient, type StandingRow } from "@/components/TableClient";

export default async function TablePage({ params }: { params: { leagueId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ownTeam = await getOwnTeamInLeague(user.id, params.leagueId);
  if (!ownTeam) redirect("/dashboard");

  const league = await prisma.league.findUniqueOrThrow({
    where: { id: params.leagueId },
    select: { name: true, season: true, settings: true },
  });
  const week = currentNflWeek(league.season);
  const settings = league.settings as { weeklyPrizesCents?: string[]; traderMonthlyPrizeCents?: string };

  const teams = await prisma.team.findMany({
    where: { leagueId: params.leagueId },
    include: {
      roster: { include: { player: { select: { marketValue: true } } } },
      results: { where: { season: league.season } },
    },
  });

  const rows: StandingRow[] = teams.map((t) => {
    const rosterValue = t.roster.reduce((sum, r) => sum + r.player.marketValue, 0n);
    const costBasis = t.roster.reduce((sum, r) => sum + r.boughtAt, 0n);
    const seasonPoints = t.results.reduce((sum, r) => sum + r.points, 0);
    const weekPoints = t.results.find((r) => r.week === week)?.points ?? 0;

    return {
      teamId: t.id,
      teamName: t.name,
      isOwnTeam: t.id === ownTeam.id,
      seasonPoints,
      weekPoints,
      valueGrowthCents: (rosterValue - costBasis).toString(),
    };
  });

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <div>
          <Link href="/dashboard" className="text-sm text-subtitle">
            ← Zurück
          </Link>
          <h1 className="text-xl font-bold text-white">Tabelle</h1>
          <p className="text-sm text-subtitle">{league.name}</p>
        </div>

        <TableClient
          rows={rows}
          currentWeek={week}
          weeklyPrizesCents={settings.weeklyPrizesCents ?? ["100000000", "50000000", "25000000"]}
          traderMonthlyPrizeCents={settings.traderMonthlyPrizeCents ?? "75000000"}
        />
      </div>
    </main>
  );
}
