import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentNflWeek } from "@/lib/nflWeek";
import { buildDefaultLineup } from "@/lib/lineup";
import { resolveExpiredListings } from "@/lib/marketService";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { buildOpponentMap, earliestKickoff, formatOpponentLabel } from "@/lib/schedule";
import { LineupEditor, type RosterPlayerView } from "@/components/LineupEditor";

export default async function TeamPage({ params }: { params: { teamId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teamCheck = await prisma.team.findUnique({
    where: { id: params.teamId },
    select: { userId: true, leagueId: true },
  });
  if (!teamCheck) redirect("/dashboard");

  const isOwner = teamCheck.userId === user.id;
  if (!isOwner) {
    // Kader anderer Teams sind transparent einsehbar – aber nur für
    // Mitspieler derselben Liga (nicht für die ganze Welt).
    const viewerTeam = await getOwnTeamInLeague(user.id, teamCheck.leagueId);
    if (!viewerTeam) redirect("/dashboard");
  }

  // Abgelaufene Markt-Angebote zuerst auflösen, damit gewonnene/verkaufte
  // Spieler hier sofort im Kader stimmen.
  await resolveExpiredListings(teamCheck.leagueId);

  const team = await prisma.team.findUnique({
    where: { id: params.teamId },
    include: {
      league: { select: { season: true, name: true } },
      roster: { include: { player: true } },
    },
  });
  if (!team) redirect("/dashboard");

  const week = currentNflWeek(team.league.season);

  let lineup = await prisma.lineup.findUnique({
    where: { teamId_season_week: { teamId: team.id, season: team.league.season, week } },
  });

  if (!lineup) {
    const previous = await prisma.lineup.findFirst({
      where: { teamId: team.id, season: team.league.season },
      orderBy: { week: "desc" },
    });
    const slots = previous
      ? (previous.slots as Record<string, string>)
      : buildDefaultLineup(
          team.roster
            .filter((r) => !r.onIr)
            .map((r) => ({
              playerId: r.playerId,
              position: r.player.position,
              marketValue: r.player.marketValue,
            }))
        );
    lineup = await prisma.lineup.create({
      data: { teamId: team.id, season: team.league.season, week, slots },
    });
  }

  const games = await prisma.nflGame.findMany({ where: { season: team.league.season, week } });
  const opponentMap = buildOpponentMap(games);
  const lineupLockAt = earliestKickoff(games);

  const roster: RosterPlayerView[] = team.roster.map((r) => {
    const gameInfo = opponentMap[r.player.nflTeam];
    return {
      playerId: r.playerId,
      name: r.player.name,
      position: r.player.position,
      nflTeam: r.player.nflTeam,
      status: r.player.status,
      marketValue: r.player.marketValue.toString(),
      onIr: r.onIr,
      opponentLabel: gameInfo ? formatOpponentLabel(gameInfo) : undefined,
      isBye: games.length > 0 && !gameInfo,
    };
  });

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-subtitle">
              ← Zurück
            </Link>
            <h1 className="text-xl font-bold text-white">
              {team.name}
              {!isOwner && <span className="ml-2 text-sm font-normal text-subtitle">(fremdes Team)</span>}
            </h1>
            <p className="text-sm text-subtitle">
              {team.league.name} · Woche {week}
            </p>
          </div>
        </div>

        <p className="rounded-2xl bg-card px-4 py-3 text-xs text-card-text-secondary shadow-xl">
          {!isOwner
            ? "Kader von Mitspielern sind offen einsehbar – nur Gebote im Transfermarkt bleiben geheim."
            : lineupLockAt
              ? `Aufstellung fest ab ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(lineupLockAt)} (erstes Spiel der Woche).`
              : "Spielplan für diese Woche noch nicht geladen – Aufstellung ist bis auf Weiteres frei änderbar."}
        </p>

        <LineupEditor
          teamId={team.id}
          leagueId={team.leagueId}
          week={week}
          initialSlots={lineup.slots as Record<string, string>}
          roster={roster}
          readOnly={!isOwner}
          lineupLockAt={lineupLockAt?.toISOString() ?? null}
        />
      </div>
    </main>
  );
}
