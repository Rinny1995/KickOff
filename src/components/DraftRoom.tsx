"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProposedSlot = { id: string; at: string };

type DraftState = {
  isFounder: boolean;
  ownTeamId: string;
  proposedSlots: ProposedSlot[];
  votes: Record<string, string>;
  scheduledAt: string | null;
  startedAt: string | null;
  completed: boolean;
  currentPick: number;
  totalPicks: number;
  currentPickDeadline: string | null;
  onTheClockTeamId: string | null;
  teamNames: Record<string, string>;
  teamCount: number;
  recentPicks: { pickNumber: number; teamName: string; playerName: string; position: string; isAutoPick: boolean }[];
  ownRoster: { playerId: string; name: string; position: string; nflTeam: string }[];
};

type DraftPlayer = { id: string; name: string; position: string; nflTeam: string; marketValue: string };

function formatUnits(cents: string): string {
  return (Number(cents) / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function useCountdownSeconds(deadlineIso: string | null): number | null {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!deadlineIso) {
      setSecs(null);
      return;
    }
    function tick() {
      setSecs(Math.max(0, Math.round((new Date(deadlineIso!).getTime() - Date.now()) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);
  return secs;
}

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

export function DraftRoom({
  leagueId,
  minTeams,
  pickTimeSeconds,
}: {
  leagueId: string;
  minTeams: number;
  pickTimeSeconds: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<DraftState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/draft/state`);
    if (res.ok) setState(await res.json());
  }, [leagueId]);

  useEffect(() => {
    loadState();
    const id = setInterval(loadState, 4000);
    return () => clearInterval(id);
  }, [loadState]);

  const loadPlayers = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim().length >= 1) params.set("q", query.trim());
    if (positionFilter) params.set("position", positionFilter);
    const res = await fetch(`/api/leagues/${leagueId}/draft/players?${params.toString()}`);
    if (res.ok) setPlayers((await res.json()).players);
  }, [leagueId, query, positionFilter]);

  useEffect(() => {
    if (state?.startedAt && !state.completed) {
      loadPlayers();
      const id = setInterval(loadPlayers, 4000);
      return () => clearInterval(id);
    }
  }, [state?.startedAt, state?.completed, loadPlayers]);

  const deadlineSecs = useCountdownSeconds(state?.currentPickDeadline ?? null);

  async function callApi(path: string, body?: object) {
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/draft/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Etwas ist schiefgelaufen");
      return false;
    }
    await loadState();
    return true;
  }

  async function handlePick(playerId: string) {
    setPicking(playerId);
    const ok = await callApi("pick", { playerId });
    setPicking(null);
    if (ok) loadPlayers();
  }

  if (!state) return <p className="text-sm text-subtitle">Lädt…</p>;

  if (state.completed) {
    return (
      <div className="rounded-2xl bg-card p-5 text-center shadow-xl">
        <p className="mb-3 font-semibold text-card-text">Der Draft ist abgeschlossen!</p>
        <Link
          href={`/team/${state.ownTeamId}`}
          className="inline-block rounded-lg bg-navy px-4 py-2.5 font-semibold text-white hover:bg-navy-dark"
        >
          Zu deinem Team
        </Link>
      </div>
    );
  }

  if (!state.startedAt) {
    const ownVote = state.votes[state.ownTeamId];
    const voteCounts: Record<string, number> = {};
    for (const v of Object.values(state.votes)) voteCounts[v] = (voteCounts[v] ?? 0) + 1;
    const canStart = state.teamCount >= minTeams;

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-card p-5 shadow-xl">
          <h2 className="mb-2 font-semibold text-card-text">Draft-Termin</h2>
          <p className="mb-3 text-xs text-card-text-secondary">
            {state.teamCount} von mind. {minTeams} Teams dabei. Stimmt ab, welcher Termin passt –
            die finale Entscheidung trifft der Gründer.
          </p>

          {state.proposedSlots.length === 0 && (
            <p className="text-sm text-card-text-secondary">Noch kein Terminvorschlag hinterlegt.</p>
          )}

          <div className="flex flex-col gap-2">
            {state.proposedSlots.map((slot) => (
              <div key={slot.id} className="rounded-lg border border-navy-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-text">{formatDateTime(slot.at)}</span>
                  <span className="text-xs text-card-text-secondary">
                    {voteCounts[slot.id] ?? 0} Stimme(n)
                  </span>
                </div>
                <button
                  onClick={() => callApi("vote", { choice: slot.id })}
                  disabled={ownVote === slot.id}
                  className="mt-2 rounded-lg border border-play-blue px-3 py-1.5 text-xs font-semibold text-play-blue disabled:border-navy disabled:bg-navy disabled:text-white"
                >
                  {ownVote === slot.id ? "Deine Stimme" : "Passt mir"}
                </button>
                {state.isFounder && (
                  <button
                    onClick={() => callApi("finalize", { slotId: slot.id })}
                    disabled={state.scheduledAt === slot.at}
                    className="ml-2 mt-2 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {state.scheduledAt === slot.at ? "Festgelegt" : "Diesen Termin festlegen"}
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => callApi("vote", { choice: "none" })}
              disabled={ownVote === "none"}
              className="rounded-lg border border-field-red-light px-3 py-1.5 text-xs font-semibold text-field-red-light disabled:opacity-50"
            >
              {ownVote === "none" ? "Du kannst an beiden nicht" : "Ich kann an beiden nicht"}
            </button>
          </div>

          {state.scheduledAt && (
            <p className="mt-3 rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-yellow-dark">
              Festgelegter Termin: {formatDateTime(state.scheduledAt)}. Der Draft startet dann
              automatisch, sobald du hier vorbeischaust – oder der Gründer startet ihn früher.
            </p>
          )}
        </div>

        {state.isFounder && (
          <div className="rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="mb-2 font-semibold text-card-text">Gründer-Optionen</h2>
            {!canStart && (
              <p className="mb-2 text-sm text-field-yellow-light">
                Noch nicht genug Teams. Warte auf weitere Beitritte oder wechsle auf Zulosung.
              </p>
            )}
            {error && <p className="mb-2 text-sm text-field-red-light">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => callApi("start")}
                disabled={!canStart}
                className="flex-1 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Draft jetzt starten
              </button>
              <button
                onClick={() => callApi("convert")}
                className="flex-1 rounded-lg border border-play-blue px-3 py-2 text-sm font-semibold text-play-blue"
              >
                Auf Zulosung wechseln
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Draft läuft
  const round = Math.ceil(state.currentPick / state.teamCount);
  const pickInRound = ((state.currentPick - 1) % state.teamCount) + 1;
  const isOwnTurn = state.onTheClockTeamId === state.ownTeamId;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between text-sm text-card-text-secondary">
          <span>
            Runde {round} · Pick {pickInRound} von {state.teamCount}
          </span>
          <span>{state.ownRoster.length}/16 eigene Picks</span>
        </div>
      </div>

      {isOwnTurn ? (
        <div className="rounded-2xl bg-field-green-dark p-4 text-center text-white shadow-xl">
          <p className="text-lg font-bold">Du bist dran!</p>
          <p className="text-2xl font-bold tabular-nums">{deadlineSecs ?? pickTimeSeconds}s</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-4 text-center shadow-xl">
          <p className="text-sm text-card-text-secondary">Am Zug:</p>
          <p className="font-semibold text-card-text">
            {state.onTheClockTeamId ? state.teamNames[state.onTheClockTeamId] : "…"}
          </p>
          <p className="text-xs text-card-text-secondary">noch {deadlineSecs ?? "–"}s</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-red-dark">{error}</p>
      )}

      <div className="rounded-2xl bg-card p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-card-text">Letzte Picks</h2>
        <div className="flex flex-col gap-1">
          {state.recentPicks.length === 0 && (
            <p className="text-xs text-card-text-secondary">Noch keine Picks.</p>
          )}
          {state.recentPicks.map((p) => (
            <div key={p.pickNumber} className="flex justify-between text-xs">
              <span className="text-card-text-secondary">
                #{p.pickNumber} {p.teamName}
              </span>
              <span className="text-card-text">
                {p.playerName} ({p.position}){p.isAutoPick ? " · Auto" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-xl">
        <input
          type="text"
          placeholder="Spieler suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 w-full rounded-lg border border-navy-muted/30 px-3 py-2 text-sm text-card-text focus:border-play-blue focus:outline-none"
        />
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setPositionFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${!positionFilter ? "bg-navy text-white" : "bg-navy-muted/15 text-card-text-secondary"}`}
          >
            Alle
          </button>
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${positionFilter === pos ? "bg-navy text-white" : "bg-navy-muted/15 text-card-text-secondary"}`}
            >
              {pos}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-navy-muted/15 p-2"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-play-blue px-1.5 py-0.5 text-xs font-semibold text-white">
                  {p.position}
                </span>
                <div>
                  <p className="text-sm font-medium text-card-text">{p.name}</p>
                  <p className="text-xs text-card-text-secondary">
                    {p.nflTeam} · Prognose-Wert {formatUnits(p.marketValue)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handlePick(p.id)}
                disabled={!isOwnTurn || picking === p.id}
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {picking === p.id ? "…" : "Draften"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-card-text">Dein Kader bisher</h2>
        <div className="flex flex-wrap gap-1.5">
          {state.ownRoster.length === 0 && (
            <p className="text-xs text-card-text-secondary">Noch keine Picks.</p>
          )}
          {state.ownRoster.map((p) => (
            <span
              key={p.playerId}
              className="rounded-full bg-navy-muted/15 px-2.5 py-1 text-xs text-card-text"
            >
              {p.position} · {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
