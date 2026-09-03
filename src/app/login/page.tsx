import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        <h1 className="text-xl font-bold text-card-text">Willkommen zurück</h1>
        <p className="mb-6 mt-1 text-sm text-card-text-secondary">
          Melde dich bei KickOff an.
        </p>
        <AuthForm mode="login" />
        <p className="mt-4 text-center text-sm text-card-text-secondary">
          Noch kein Konto?{" "}
          <Link href="/register" className="font-semibold text-play-blue">
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </main>
  );
}
