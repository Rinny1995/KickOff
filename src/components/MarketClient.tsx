"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BidDialog } from "./BidDialog";

export type ListingView = {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  status: string;
  minPriceCents: string;
  deadline: string;
  sellerLabel: string;
  ownBidCents: string | null;
  watched: boolean;
};

export type WatchedPlayerView = {
  playerId: string;
  name: string;
  position: string;
  marketValueCents: string;
};

type SearchPlayer = {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  status: string;
  marketValue: string;
};

function formatUnits(cents: string): string {
  return (Number(cents) / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

function PositionBadge({ position }: { position: string }) {
  return (
    <span className="rounded bg-play-blue px-1.5 py-0.5 text-xs font-semibold text-white">
      {position}
    </span>
  );
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function tick() {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("läuft ab");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(`${h}h ${m}min`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadline]);
  return (
    <span className="rounded-full bg-field-yellow-bg px-2 py-0.5 text-xs font-semibold text-field-yellow-dark">
      {label}
    </span>
  );
}

export function MarketClient({
  leagueId,
  budgetCents,
  initialListings,
  initialWatchlist,
}: {
  leagueId: string;
  budgetCents: string;
  initialListings: ListingView[];
  initialWatchlist: WatchedPlayerView[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<
    | { kind: "listing"; listing: ListingView }
    | { kind: "player"; player: SearchPlayer }
    | null
  >(null);
  const [watchedIds, setWatchedIds] = useState(
    new Set(initialWatchlist.map((w) => w.playerId))
  );

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/leagues/${leagueId}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.players ?? []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, leagueId]);

  async function toggleWatch(playerId: string) {
    const res = await fetch(`/api/leagues/${leagueId}/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (data.watched) next.add(playerId);
      else next.delete(playerId);
      return next;
    });
  }

  async function submitBid(playerId: string, amountCents: string): Promise<string | null> {
    const res = await fetch(`/api/leagues/${leagueId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, amountCents }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Etwas ist schiefgelaufen";
    router.refresh();
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {initialWatchlist.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-subtitle">
            Beobachtungsliste
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {initialWatchlist.map((w) => (
              <div
                key={w.playerId}
                className="min-w-[140px] shrink-0 rounded-xl bg-card p-3 shadow-xl"
              >
                <PositionBadge position={w.position} />
                <p className="mt-1 truncate text-sm font-semibold text-card-text">{w.name}</p>
                <p className="text-xs text-card-text-secondary">
                  {formatUnits(w.marketValueCents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card p-4 shadow-xl">
        <input
          type="text"
          placeholder="Spieler suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
        />
        {searching && <p className="mt-2 text-xs text-card-text-secondary">Suche…</p>}
        {results.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {results.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-navy-muted/15 p-2"
              >
                <div className="flex items-center gap-2">
                  <PositionBadge position={p.position} />
                  <div>
                    <p className="text-sm font-medium text-card-text">{p.name}</p>
                    <p className="text-xs text-card-text-secondary">
                      {p.nflTeam} · {formatUnits(p.marketValue)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWatch(p.id)}
                    className={watchedIds.has(p.id) ? "text-field-yellow-light" : "text-navy-muted"}
                    title="Beobachten"
                  >
                    ★
                  </button>
                  <button
                    onClick={() => setDialogTarget({ kind: "player", player: p })}
                    className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-dark"
                  >
                    Gebot abgeben
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-subtitle">
          Angebote ({initialListings.length})
        </h2>
        {initialListings.length === 0 && (
          <p className="rounded-2xl bg-card p-5 text-sm text-card-text-secondary shadow-xl">
            Aktuell läuft kein Angebot. Nutze die Suche, um ein Gebot auf einen freien Spieler
            abzugeben.
          </p>
        )}
        {initialListings.map((l) => (
          <div key={l.id} className="rounded-2xl bg-card p-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <PositionBadge position={l.position} />
                  <span className="font-semibold text-card-text">{l.playerName}</span>
                </div>
                <p className="text-xs text-card-text-secondary">
                  {l.nflTeam} · {formatUnits(l.minPriceCents)} Mindestpreis · von {l.sellerLabel}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <DeadlineBadge deadline={l.deadline} />
                <button
                  onClick={() => toggleWatch(l.playerId)}
                  className={l.watched ? "text-field-yellow-light" : "text-navy-muted"}
                  title="Beobachten"
                >
                  ★
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              {l.ownBidCents ? (
                <span className="rounded-full bg-field-yellow-bg px-2 py-0.5 text-xs font-semibold text-field-green-dark">
                  Dein Gebot liegt vor: {formatUnits(l.ownBidCents)}
                </span>
              ) : (
                <span />
              )}
              <button
                onClick={() => setDialogTarget({ kind: "listing", listing: l })}
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-dark"
              >
                {l.ownBidCents ? "Gebot ändern" : "Gebot abgeben"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {dialogTarget && (
        <BidDialog
          playerName={
            dialogTarget.kind === "listing" ? dialogTarget.listing.playerName : dialogTarget.player.name
          }
          position={
            dialogTarget.kind === "listing" ? dialogTarget.listing.position : dialogTarget.player.position
          }
          minPriceCents={
            dialogTarget.kind === "listing"
              ? dialogTarget.listing.minPriceCents
              : dialogTarget.player.marketValue
          }
          deadlineIso={dialogTarget.kind === "listing" ? dialogTarget.listing.deadline : null}
          budgetCents={budgetCents}
          initialAmountCents={
            dialogTarget.kind === "listing"
              ? dialogTarget.listing.ownBidCents ?? dialogTarget.listing.minPriceCents
              : dialogTarget.player.marketValue
          }
          onClose={() => setDialogTarget(null)}
          onSubmit={(amountCents) =>
            submitBid(
              dialogTarget.kind === "listing" ? dialogTarget.listing.playerId : dialogTarget.player.id,
              amountCents
            )
          }
        />
      )}
    </div>
  );
}
