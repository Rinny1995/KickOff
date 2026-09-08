import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/dashboard");

  const [users, leagues, feedback] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true, _count: { select: { teams: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.league.findMany({
      include: {
        founder: { select: { name: true } },
        teams: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <div>
          <Link href="/dashboard" className="text-sm text-subtitle">
            ← Zurück
          </Link>
          <h1 className="text-xl font-bold text-white">Admin</h1>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card p-4 text-center shadow-xl">
            <p className="text-2xl font-bold text-card-text">{users.length}</p>
            <p className="text-xs text-card-text-secondary">Nutzer</p>
          </div>
          <div className="rounded-2xl bg-card p-4 text-center shadow-xl">
            <p className="text-2xl font-bold text-card-text">{leagues.length}</p>
            <p className="text-xs text-card-text-secondary">Ligen</p>
          </div>
          <div className="rounded-2xl bg-card p-4 text-center shadow-xl">
            <p className="text-2xl font-bold text-card-text">{feedback.length}</p>
            <p className="text-xs text-card-text-secondary">Feedback</p>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtitle">
            Feedback ({feedback.length})
          </h2>
          {feedback.length === 0 && (
            <p className="rounded-2xl bg-card p-4 text-sm text-card-text-secondary shadow-xl">
              Noch kein Feedback eingegangen.
            </p>
          )}
          {feedback.map((f) => (
            <div key={f.id} className="rounded-2xl bg-card p-4 shadow-xl">
              <p className="whitespace-pre-wrap text-sm text-card-text">{f.message}</p>
              <p className="mt-2 text-xs text-card-text-secondary">
                {f.user.name} ({f.user.email}) · {formatDate(f.createdAt)}
              </p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtitle">
            Ligen ({leagues.length})
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-xl">
            {leagues.map((l) => {
              const settings = l.settings as { draftMode?: string };
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between border-b border-navy-muted/15 px-4 py-2.5 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium text-card-text">{l.name}</p>
                    <p className="text-xs text-card-text-secondary">
                      Gründer: {l.founder.name} · {settings.draftMode === "assigned" ? "Zulosung" : "Snake-Draft"} ·
                      Saison {l.season}
                    </p>
                  </div>
                  <span className="text-xs text-card-text-secondary">{l.teams.length} Teams</span>
                </div>
              );
            })}
            {leagues.length === 0 && (
              <p className="p-4 text-sm text-card-text-secondary">Noch keine Liga gegründet.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtitle">
            Nutzer ({users.length})
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-xl">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between border-b border-navy-muted/15 px-4 py-2.5 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium text-card-text">{u.name}</p>
                  <p className="text-xs text-card-text-secondary">{u.email}</p>
                </div>
                <div className="text-right text-xs text-card-text-secondary">
                  <p>{u._count.teams} Team(s)</p>
                  <p>seit {formatDate(u.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
