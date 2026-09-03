import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnTeamInLeague } from "@/lib/leagueService";
import { tickDraft } from "@/lib/draftService";
import { DraftRoom } from "@/components/DraftRoom";

export default async function DraftPage({ params }: { params: { leagueId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const team = await getOwnTeamInLeague(user.id, params.leagueId);
  if (!team) redirect("/dashboard");

  await tickDraft(params.leagueId);

  const league = await prisma.league.findUniqueOrThrow({
    where: { id: params.leagueId },
    select: { name: true, settings: true },
  });
  const settings = league.settings as { minTeams?: number; pickTimeSeconds?: number };

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-20">
        <div>
          <Link href="/dashboard" className="text-sm text-subtitle">
            ← Zurück
          </Link>
          <h1 className="text-xl font-bold text-white">Draft-Raum</h1>
          <p className="text-sm text-subtitle">{league.name}</p>
        </div>

        <DraftRoom
          leagueId={params.leagueId}
          minTeams={settings.minTeams ?? 4}
          pickTimeSeconds={settings.pickTimeSeconds ?? 60}
        />
      </div>
    </main>
  );
}
