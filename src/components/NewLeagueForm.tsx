"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewLeagueForm() {
  const router = useRouter();
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [draftMode, setDraftMode] = useState<"assigned" | "snake">("assigned");
  const [slotA, setSlotA] = useState("");
  const [slotB, setSlotB] = useState("");
  const [visibility, setVisibility] = useState<"link" | "password">("link");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const draftSlots =
        draftMode === "snake"
          ? [
              ...(slotA ? [{ id: "a", at: new Date(slotA).toISOString() }] : []),
              ...(slotB ? [{ id: "b", at: new Date(slotB).toISOString() }] : []),
            ]
          : undefined;

      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueName,
          teamName,
          draftMode,
          visibility,
          password: visibility === "password" ? password : undefined,
          draftSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen");
        setLoading(false);
        return;
      }
      setInviteCode(data.inviteCode);
    } catch {
      setError("Verbindung fehlgeschlagen. Prüfe deine Internetverbindung.");
    } finally {
      setLoading(false);
    }
  }

  if (inviteCode) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode}` : "";
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-yellow-dark">
          {draftMode === "assigned"
            ? "Liga gegründet! Dein Kader wurde direkt fair zugelost."
            : "Liga gegründet! Im Draft-Raum könnt ihr über den Termin abstimmen, sobald genug Teams da sind."}
        </p>
        <div>
          <p className="mb-1 text-sm text-card-text-secondary">Einladungslink zum Teilen:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-lg border border-navy-muted/30 bg-white px-3 py-2 text-sm text-card-text"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(link)}
              className="rounded-lg bg-play-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Kopieren
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="rounded-lg bg-navy px-4 py-2.5 text-center font-semibold text-white hover:bg-navy-dark"
        >
          Weiter zum Dashboard
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-card-text-secondary">
        Liganame
        <input
          type="text"
          required
          minLength={3}
          maxLength={40}
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          className="rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
        />
      </label>

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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-card-text-secondary">Liga-Start</legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-navy-muted/30 p-3 text-sm has-[:checked]:border-play-blue has-[:checked]:bg-play-blue/5">
          <input
            type="radio"
            name="draftMode"
            checked={draftMode === "assigned"}
            onChange={() => setDraftMode("assigned")}
            className="mt-0.5"
          />
          <span>
            <span className="block font-semibold text-card-text">Zulosung (Draft überspringen)</span>
            <span className="block text-card-text-secondary">
              Jedes Team bekommt sofort einen fair zugelosten Kader. Kein Termin nötig.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-navy-muted/30 p-3 text-sm has-[:checked]:border-play-blue has-[:checked]:bg-play-blue/5">
          <input
            type="radio"
            name="draftMode"
            checked={draftMode === "snake"}
            onChange={() => setDraftMode("snake")}
            className="mt-0.5"
          />
          <span>
            <span className="block font-semibold text-card-text">Snake-Draft</span>
            <span className="block text-card-text-secondary">
              Ihr draftet live zu einem gemeinsamen Termin. Mitspieler stimmen im Draft-Raum ab,
              du entscheidest final.
            </span>
          </span>
        </label>
        {draftMode === "snake" && (
          <div className="ml-1 flex flex-col gap-2 border-l-2 border-play-blue/30 pl-3">
            <label className="flex flex-col gap-1 text-xs text-card-text-secondary">
              Terminvorschlag 1
              <input
                type="datetime-local"
                required
                value={slotA}
                onChange={(e) => setSlotA(e.target.value)}
                className="rounded-lg border border-navy-muted/30 px-3 py-2 text-sm text-card-text focus:border-play-blue focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-card-text-secondary">
              Terminvorschlag 2 (optional)
              <input
                type="datetime-local"
                value={slotB}
                onChange={(e) => setSlotB(e.target.value)}
                className="rounded-lg border border-navy-muted/30 px-3 py-2 text-sm text-card-text focus:border-play-blue focus:outline-none"
              />
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-card-text-secondary">Beitritt</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            checked={visibility === "link"}
            onChange={() => setVisibility("link")}
          />
          Nur per Einladungslink (Standard)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            checked={visibility === "password"}
            onChange={() => setVisibility("password")}
          />
          Link + Kennwort
        </label>
        {visibility === "password" && (
          <input
            type="text"
            placeholder="Kennwort"
            required
            minLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-navy-muted/30 px-3 py-2 text-sm text-card-text focus:border-play-blue focus:outline-none"
          />
        )}
      </fieldset>

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
        {loading ? "Einen Moment…" : "Liga gründen"}
      </button>
    </form>
  );
}
