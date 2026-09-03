import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewLeagueForm } from "@/components/NewLeagueForm";

export default async function NewLeaguePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h1 className="text-xl font-bold text-card-text">Liga gründen</h1>
        <p className="mb-6 mt-1 text-sm text-card-text-secondary">
          Lege Name, Start-Modus und Beitritt fest.
        </p>
        <NewLeagueForm />
      </div>
    </main>
  );
}
