"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewSeasonButton({ leagueId, currentSeason }: { leagueId: string; currentSeason: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/new-season`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-3 rounded-lg bg-field-yellow-bg p-3 text-xs text-field-yellow-dark">
        <p className="mb-2 font-semibold">
          Kader und Budget aller Teams werden auf Saison {currentSeason + 1} zurückgesetzt. Die
          Tabelle von Saison {currentSeason} bleibt erhalten. Das lässt sich nicht rückgängig
          machen.
        </p>
        {error && <p className="mb-2 text-field-red-dark">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-navy px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Einen Moment…" : "Ja, neue Saison starten"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-lg border border-navy-muted/30 px-3 py-1.5 font-semibold text-card-text"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-3 w-full rounded-lg border border-play-blue px-3 py-2 text-sm font-semibold text-play-blue hover:bg-play-blue/10"
    >
      Neue Saison starten ({currentSeason} → {currentSeason + 1})
    </button>
  );
}
