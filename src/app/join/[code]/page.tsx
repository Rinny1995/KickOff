import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinLeagueForm } from "@/components/JoinLeagueForm";

export default async function JoinLeaguePage({ params }: { params: { code: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/join/${params.code}`);

  const league = await prisma.league.findUnique({
    where: { inviteCode: params.code },
    include: { teams: { select: { id: true } } },
  });

  if (!league) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-xl">
          <h1 className="text-lg font-bold text-card-text">Liga nicht gefunden</h1>
          <p className="mt-2 text-sm text-card-text-secondary">
            Der Einladungscode ist ungültig oder die Liga wurde gelöscht.
          </p>
        </div>
      </main>
    );
  }

  const settings = league.settings as { draftMode?: string; maxTeams?: number };
  const modeLabel = settings.draftMode === "assigned" ? "Zulosung – dein Kader steht sofort" : "Snake-Draft";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h1 className="text-xl font-bold text-card-text">{league.name}</h1>
        <p className="mb-6 mt-1 text-sm text-card-text-secondary">
          {modeLabel} · {league.teams.length}
          {settings.maxTeams ? ` / ${settings.maxTeams}` : ""} Teams dabei
        </p>
        <JoinLeagueForm inviteCode={league.inviteCode} requiresPassword={league.visibility === "password"} />
      </div>
    </main>
  );
}
