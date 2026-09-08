"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteLeagueButton({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
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
          Löscht die Liga endgültig – inklusive Kader, Tabelle und Markt-Historie aller
          Mitspieler, nicht nur deiner eigenen. Das lässt sich nicht rückgängig machen.
        </p>
        <label className="mb-2 flex flex-col gap-1">
          Gib zur Bestätigung den Liganamen ein: <span className="font-semibold">{leagueName}</span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="rounded-lg border border-navy-muted/30 px-2 py-1 text-input-text focus:border-play-blue focus:outline-none"
          />
        </label>
        {error && <p className="mb-2 text-field-red-dark">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== leagueName}
            className="rounded-lg bg-field-red-dark px-3 py-1.5 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Einen Moment…" : "Liga endgültig löschen"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setConfirmText("");
            }}
            disabled={loading}
            className="rounded-lg border border-navy-muted/30 px-3 py-1.5 font-semibold text-field-yellow-dark"
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
      className="mt-3 w-full rounded-lg border border-field-red-light/60 px-3 py-2 text-sm font-semibold text-field-red-light hover:bg-field-red-light/10"
    >
      Liga löschen
    </button>
  );
}
