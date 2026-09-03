import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinByCodeForm } from "@/components/JoinByCodeForm";
import { LogoutButton } from "@/components/LogoutButton";
import { resolveExpiredListings } from "@/lib/marketService";
import { canStartNewSeason } from "@/lib/nflWeek";
import { NewSeasonButton } from "@/components/NewSeasonButton";
import { InviteLink } from "@/components/InviteLink";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const leagueIds = await prisma.team.findMany({
    where: { userId: user.id },
    select: { leagueId: true },
  });
  // Abgelaufene Markt-Angebote in allen eigenen Ligen auflösen, damit
  // Budget und Kadergröße hier immer aktuell sind.
  await Promise.all(leagueIds.map((t) => resolveExpiredListings(t.leagueId)));

  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    include: {
      league: true,
      roster: true,
    },
    orderBy: { id: "desc" },
  });

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-subtitle">Willkommen zurück,</p>
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
          </div>
          <LogoutButton />
        </header>

        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-xl">
          <h2 className="font-semibold text-card-text">Neue Liga</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/leagues/new"
              className="flex-1 rounded-lg bg-navy px-4 py-2.5 text-center font-semibold text-white hover:bg-navy-dark"
            >
              Liga gründen
            </Link>
          </div>
          <div className="mt-2 border-t border-navy-muted/20 pt-3">
            <p className="mb-2 text-sm text-card-text-secondary">Schon einen Einladungscode?</p>
            <JoinByCodeForm />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtitle">
            Deine Ligen
          </h2>
          {teams.length === 0 && (
            <p className="rounded-2xl bg-card p-5 text-card-text-secondary shadow-xl">
              Du bist noch in keiner Liga. Gründe deine erste oder tritt mit einem
              Einladungscode bei.
            </p>
          )}
          {teams.map((team) => {
            const settings = team.league.settings as { draftMode?: string };
            const modeLabel = settings.draftMode === "assigned" ? "Zulosung" : "Snake-Draft";
            const budget = (Number(team.budget) / 100).toLocaleString("de-DE", {
              maximumFractionDigits: 0,
            });
            return (
              <div key={team.id} className="rounded-2xl bg-card p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-card-text">{team.league.name}</h3>
                  <span className="rounded-full bg-play-blue px-2.5 py-0.5 text-xs font-semibold text-white">
                    {modeLabel}
                  </span>
                </div>
                <p className="text-sm text-card-text-secondary">Dein Team: {team.name}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-card-text-secondary">
                    Kader: {team.roster.length} Spieler
                  </span>
                  <span className="font-semibold text-ball-green">{budget} Budget</span>
                </div>
                {team.roster.length > 0 ? (
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/team/${team.id}`}
                      className="flex-1 rounded-lg bg-navy px-3 py-2 text-center text-sm font-semibold text-white hover:bg-navy-dark"
                    >
                      Team ansehen
                    </Link>
                    <Link
                      href={`/market/${team.leagueId}`}
                      className="flex-1 rounded-lg bg-play-blue px-3 py-2 text-center text-sm font-semibold text-white hover:opacity-90"
                    >
                      Transfermarkt
                    </Link>
                    <Link
                      href={`/table/${team.leagueId}`}
                      className="flex-1 rounded-lg bg-navy-dark px-3 py-2 text-center text-sm font-semibold text-white hover:opacity-90"
                    >
                      Tabelle
                    </Link>
                  </div>
                ) : (
                  settings.draftMode === "snake" && (
                    <Link
                      href={`/draft/${team.leagueId}`}
                      className="mt-3 block rounded-lg bg-navy px-3 py-2 text-center text-sm font-semibold text-white hover:bg-navy-dark"
                    >
                      Zum Draft-Raum
                    </Link>
                  )
                )}
                {team.league.founderId === user.id && (
                  <>
                    <InviteLink inviteCode={team.league.inviteCode} />
                    {canStartNewSeason(team.league.season) && (
                      <NewSeasonButton leagueId={team.leagueId} currentSeason={team.league.season} />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
