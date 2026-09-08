import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FeedbackForm } from "@/components/FeedbackForm";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-subtitle">
            ← Zurück
          </Link>
          <h1 className="text-xl font-bold text-white">Feedback</h1>
        </div>
        <FeedbackForm />
      </div>
    </main>
  );
}
