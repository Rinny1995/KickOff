"use client";

import { useState } from "react";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen");
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-card p-5 text-center shadow-xl">
        <p className="font-semibold text-card-text">Danke für dein Feedback!</p>
        <p className="mt-1 text-sm text-card-text-secondary">Kommt direkt beim Gründer an.</p>
        <button
          onClick={() => setSent(false)}
          className="mt-3 rounded-lg border border-play-blue px-3 py-1.5 text-sm font-semibold text-play-blue"
        >
          Noch etwas melden
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card p-5 shadow-xl">
      <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
        Was sollen wir wissen? Bug, Idee, einfach nur meckern – alles willkommen.
        <textarea
          required
          minLength={3}
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-lg border border-navy-muted/30 px-3 py-2 text-input-text focus:border-play-blue focus:outline-none"
        />
      </label>

      {error && (
        <p className="mt-2 rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-red-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 w-full rounded-lg bg-navy px-4 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
      >
        {loading ? "Wird gesendet…" : "Feedback senden"}
      </button>
    </form>
  );
}
