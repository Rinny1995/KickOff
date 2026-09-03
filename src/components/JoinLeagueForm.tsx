"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinLeagueForm({
  inviteCode,
  requiresPassword,
}: {
  inviteCode: string;
  requiresPassword: boolean;
}) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, teamName, password: requiresPassword ? password : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Prüfe deine Internetverbindung.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
        Dein Teamname
        <input
          type="text"
          required
          minLength={2}
          maxLength={30}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
        />
      </label>

      {requiresPassword && (
        <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
          Kennwort der Liga
          <input
            type="text"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
          />
        </label>
      )}

      {error && (
        <p className="rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-red-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-navy px-4 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
      >
        {loading ? "Einen Moment…" : "Liga beitreten"}
      </button>
    </form>
  );
}
