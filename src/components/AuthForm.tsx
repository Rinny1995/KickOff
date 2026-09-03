"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { email, name, password }),
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
      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
          Teamname / Anzeigename
          <input
            type="text"
            required
            minLength={2}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
        E-Mail
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
        Passwort
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
        />
        {mode === "register" && (
          <span className="text-xs text-card-text-secondary">Mindestens 8 Zeichen</span>
        )}
      </label>

      {error && (
        <p className="rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-red-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-navy px-4 py-2.5 font-semibold text-white transition hover:bg-navy-dark disabled:opacity-60"
      >
        {loading ? "Einen Moment…" : mode === "login" ? "Einloggen" : "Konto erstellen"}
      </button>
    </form>
  );
}
