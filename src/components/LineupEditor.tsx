"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isEligibleForSlot, ROSTER_RULES } from "@/lib/draft";

export type RosterPlayerView = {
  playerId: string;
  name: string;
  position: string;
  nflTeam: string;
  status: string; // "active" | "injured" | "ir" | "bye"
  marketValue: string; // Cent, als String (BigInt-sicher über die Server-Grenze)
  onIr: boolean;
  opponentLabel?: string; // "vs. GB, So 19:00" / "@ GB, So 19:00"
  isBye?: boolean;
  matchupRating?: "easy" | "hard" | "neutral" | null;
};

const OFFENSE_SLOTS = ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX"];
const DEFENSE_SLOTS = ["DEF"];
const SPECIAL_TEAMS_SLOTS = ["K"];

function formatValue(cents: string): string {
  return (Number(cents) / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

function PositionBadge({ position }: { position: string }) {
  return (
    <span className="rounded bg-play-blue px-1.5 py-0.5 text-xs font-semibold text-white">
      {position}
    </span>
  );
}

// Matchup-Ampel: grün = leichter Gegner, rot = schwerer Gegner. Ohne
// genug Saisondaten (z.B. Saisonstart) zeigen wir gar nichts an, statt zu raten.
function MatchupDot({ rating }: { rating?: "easy" | "hard" | "neutral" | null }) {
  if (!rating || rating === "neutral") return null;
  const color = rating === "easy" ? "bg-field-green-dark" : "bg-field-red-dark";
  const title = rating === "easy" ? "Leichter Gegner" : "Schwerer Gegner";
  return <span title={title} className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

export function LineupEditor({
  teamId,
  leagueId,
  week,
  initialSlots,
  roster,
  readOnly = false,
  lineupLockAt = null,
}: {
  teamId: string;
  leagueId: string;
  week: number;
  initialSlots: Record<string, string>;
  roster: RosterPlayerView[];
  readOnly?: boolean;
  lineupLockAt?: string | null;
}) {
  const router = useRouter();
  const isLocked = !readOnly && !!lineupLockAt && Date.now() >= new Date(lineupLockAt).getTime();
  const editable = !readOnly && !isLocked;
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellMessage, setSellMessage] = useState<string | null>(null);
  const [irIds, setIrIds] = useState<Set<string>>(
    new Set(roster.filter((p) => p.onIr).map((p) => p.playerId))
  );
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    offense: true,
    defense: false,
    special: false,
    bench: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const playerById = useMemo(() => new Map(roster.map((p) => [p.playerId, p])), [roster]);
  const starterIds = useMemo(() => new Set(Object.values(slots).filter(Boolean)), [slots]);

  const benchPlayers = roster.filter((p) => !starterIds.has(p.playerId) && !irIds.has(p.playerId));
  const irPlayers = roster.filter((p) => irIds.has(p.playerId));

  function eligibleBenchFor(slot: string) {
    return benchPlayers.filter((p) => isEligibleForSlot(slot, p.position));
  }

  function swapIn(slot: string, playerId: string) {
    setSlots((prev) => ({ ...prev, [slot]: playerId }));
    setSwappingSlot(null);
    setDirty(true);
    setMessage(null);
  }

  function moveToIr(playerId: string) {
    if (irIds.size >= ROSTER_RULES.irSize) {
      setMessage({ type: "error", text: `Maximal ${ROSTER_RULES.irSize} Spieler auf der IR` });
      return;
    }
    setIrIds((prev) => new Set(prev).add(playerId));
    setDirty(true);
    setMessage(null);
  }

  function moveFromIr(playerId: string) {
    setIrIds((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
    setDirty(true);
  }

  async function sellPlayer(playerId: string) {
    const minPriceCents = String(Math.round(Number(sellPrice) * 100));
    try {
      const res = await fetch(`/api/leagues/${leagueId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, minPriceCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSellMessage(data.error ?? "Etwas ist schiefgelaufen");
        return;
      }
      setSellMessage("Spieler steht jetzt zum Verkauf im Transfermarkt.");
      setSellingId(null);
      router.refresh();
    } catch {
      setSellMessage("Verbindung fehlgeschlagen.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, slots, irPlayerIds: [...irIds] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Etwas ist schiefgelaufen" });
        return;
      }
      setMessage({ type: "ok", text: "Aufstellung gespeichert." });
      setDirty(false);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Verbindung fehlgeschlagen." });
    } finally {
      setSaving(false);
    }
  }

  function toggle(section: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function renderSlotRow(slot: string) {
    const playerId = slots[slot];
    const player = playerId ? playerById.get(playerId) : undefined;
    const isSwapping = swappingSlot === slot;
    const options = eligibleBenchFor(slot);

    return (
      <div key={slot} className="border-b border-navy-muted/15 py-3 last:border-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-12 shrink-0 text-xs font-semibold text-card-text-secondary">
              {slot}
            </span>
            {player ? (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <PositionBadge position={player.position} />
                  <span className="truncate font-medium text-card-text">{player.name}</span>
                  <MatchupDot rating={player.matchupRating} />
                </div>
                <div className="text-xs text-card-text-secondary">
                  {player.opponentLabel ?? player.nflTeam} · {formatValue(player.marketValue)} Marktwert
                  {player.status === "injured" && (
                    <span className="ml-1 text-field-red-dark">· verletzt</span>
                  )}
                </div>
                {player.isBye && (
                  <p className="mt-0.5 text-xs font-semibold text-field-yellow-dark">
                    Spielfrei diese Woche – bitte tauschen
                  </p>
                )}
              </div>
            ) : (
              <span className="text-sm text-field-yellow-dark">Slot ist nicht besetzt</span>
            )}
          </div>
          {editable && (
            <button
              type="button"
              onClick={() => setSwappingSlot(isSwapping ? null : slot)}
              className="shrink-0 rounded-lg border border-play-blue px-3 py-1.5 text-xs font-semibold text-play-blue hover:bg-play-blue/10"
            >
              Tauschen
            </button>
          )}
        </div>

        {editable && isSwapping && (
          <div className="mt-2 rounded-lg bg-navy/5 p-2">
            {options.length === 0 ? (
              <p className="px-2 py-1 text-xs text-card-text-secondary">
                Keine passenden Bankspieler verfügbar.
              </p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.playerId}
                  type="button"
                  onClick={() => swapIn(slot, opt.playerId)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white"
                >
                  <span className="flex items-center gap-1.5">
                    <PositionBadge position={opt.position} />
                    {opt.name}
                  </span>
                  <span className="text-xs text-card-text-secondary">
                    {formatValue(opt.marketValue)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const injuredStarterCount = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS, ...SPECIAL_TEAMS_SLOTS].filter(
    (slot) => {
      const p = slots[slot] ? playerById.get(slots[slot]) : undefined;
      return p?.status === "injured";
    }
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-card-text">
          Offense
          {injuredStarterCount > 0 && (
            <span className="rounded-full bg-field-yellow-bg px-2 py-0.5 text-xs text-field-yellow-dark">
              {injuredStarterCount} verletzt
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => toggle("offense")}
          className="mb-1 text-xs text-play-blue"
        >
          {openSections.offense ? "Einklappen" : "Ausklappen"}
        </button>
        {openSections.offense && <div>{OFFENSE_SLOTS.map(renderSlotRow)}</div>}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="mb-1 font-semibold text-card-text">Defense</h2>
        <button
          type="button"
          onClick={() => toggle("defense")}
          className="mb-1 text-xs text-play-blue"
        >
          {openSections.defense ? "Einklappen" : "Ausklappen"}
        </button>
        {openSections.defense && <div>{DEFENSE_SLOTS.map(renderSlotRow)}</div>}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="mb-1 font-semibold text-card-text">Special Teams</h2>
        <button
          type="button"
          onClick={() => toggle("special")}
          className="mb-1 text-xs text-play-blue"
        >
          {openSections.special ? "Einklappen" : "Ausklappen"}
        </button>
        {openSections.special && <div>{SPECIAL_TEAMS_SLOTS.map(renderSlotRow)}</div>}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="mb-1 font-semibold text-card-text">
          Bank + IR ({benchPlayers.length + irPlayers.length})
        </h2>
        <button type="button" onClick={() => toggle("bench")} className="mb-1 text-xs text-play-blue">
          {openSections.bench ? "Einklappen" : "Ausklappen"}
        </button>
        {openSections.bench && (
          <div>
            {benchPlayers.map((p) => (
              <div key={p.playerId} className="border-b border-navy-muted/15 py-2 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <PositionBadge position={p.position} />
                    <span className="text-sm text-card-text">{p.name}</span>
                    <span className="text-xs text-card-text-secondary">
                      ({p.opponentLabel ?? p.nflTeam}, {formatValue(p.marketValue)})
                    </span>
                    {p.isBye && <span className="text-xs text-field-yellow-dark">spielfrei</span>}
                    {p.status === "injured" && (
                      <span className="text-xs text-field-red-dark">verletzt</span>
                    )}
                  </div>
                  {editable && (
                    <div className="flex items-center gap-2">
                      {p.status === "injured" && (
                        <button
                          type="button"
                          onClick={() => moveToIr(p.playerId)}
                          className="rounded-lg border border-field-red-dark px-2 py-1 text-xs font-semibold text-field-red-dark hover:bg-field-yellow-bg"
                        >
                          Auf IR
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSellingId(sellingId === p.playerId ? null : p.playerId);
                          setSellPrice(String(Math.round(Number(p.marketValue) / 100)));
                          setSellMessage(null);
                        }}
                        className="rounded-lg border border-play-blue px-2 py-1 text-xs font-semibold text-play-blue hover:bg-play-blue/10"
                      >
                        Verkaufen
                      </button>
                    </div>
                  )}
                </div>
                {editable && sellingId === p.playerId && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-navy/5 p-2">
                    <span className="text-xs text-card-text-secondary">Mindestpreis</span>
                    <input
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="w-28 rounded-lg border border-navy-muted/30 px-2 py-1 text-sm text-card-text focus:border-play-blue focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => sellPlayer(p.playerId)}
                      className="rounded-lg bg-navy px-3 py-1 text-xs font-semibold text-white hover:bg-navy-dark"
                    >
                      Anbieten
                    </button>
                  </div>
                )}
              </div>
            ))}
            {editable && sellMessage && (
              <p className="mt-2 rounded-lg bg-field-yellow-bg px-3 py-2 text-xs text-field-yellow-dark">
                {sellMessage}
              </p>
            )}
            {irPlayers.length > 0 && (
              <div className="mt-2 border-t border-navy-muted/15 pt-2">
                <p className="mb-1 text-xs font-semibold text-field-red-dark">
                  IR ({irPlayers.length}/{ROSTER_RULES.irSize})
                </p>
                {irPlayers.map((p) => (
                  <div
                    key={p.playerId}
                    className="flex items-center justify-between rounded-lg bg-field-yellow-bg/60 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <PositionBadge position={p.position} />
                      <span className="text-sm text-card-text">{p.name}</span>
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => moveFromIr(p.playerId)}
                        className="rounded-lg border border-navy px-2 py-1 text-xs font-semibold text-navy hover:bg-white"
                      >
                        Von IR zurück
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isLocked && (
        <p className="sticky bottom-4 rounded-lg bg-navy px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          Aufstellung ist eingefroren – das erste Spiel der Woche läuft bereits.
        </p>
      )}

      {editable && (
        <div className="sticky bottom-4 flex flex-col gap-2">
          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "ok"
                  ? "bg-field-yellow-bg text-field-green-dark"
                  : "bg-field-yellow-bg text-field-red-dark"
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="rounded-lg bg-navy px-4 py-3 font-semibold text-white shadow-xl hover:bg-navy-dark disabled:opacity-50"
          >
            {saving ? "Speichert…" : dirty ? "Aufstellung speichern" : "Aufstellung ist gespeichert"}
          </button>
        </div>
      )}
    </div>
  );
}
