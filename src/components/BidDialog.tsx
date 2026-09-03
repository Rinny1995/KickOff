"use client";

import { useEffect, useState } from "react";

function centsToUnits(cents: string): number {
  return Number(cents) / 100;
}

function formatUnits(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

function useCountdown(deadlineIso: string | null) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!deadlineIso) {
      setLabel("Startet mit deinem Gebot – läuft dann 24h");
      return;
    }
    function tick() {
      const ms = new Date(deadlineIso!).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Frist abgelaufen");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(`Noch ${h}h ${m}min`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadlineIso]);
  return label;
}

export function BidDialog({
  playerName,
  position,
  minPriceCents,
  deadlineIso,
  budgetCents,
  initialAmountCents,
  onClose,
  onSubmit,
}: {
  playerName: string;
  position: string;
  minPriceCents: string;
  deadlineIso: string | null;
  budgetCents: string;
  initialAmountCents: string;
  onClose: () => void;
  onSubmit: (amountCents: string) => Promise<string | null>; // gibt Fehlermeldung oder null zurück
}) {
  const [amount, setAmount] = useState(Math.ceil(centsToUnits(initialAmountCents)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const countdown = useCountdown(deadlineIso);

  const minUnits = centsToUnits(minPriceCents);
  const budgetUnits = centsToUnits(budgetCents);
  const budgetAfter = budgetUnits - amount;

  function addQuick(unitsDelta: number) {
    setAmount((prev) => prev + unitsDelta);
  }

  async function handleSubmit() {
    setError(null);
    if (amount < minUnits) {
      setError(`Gebot muss mindestens ${formatUnits(minUnits)} sein`);
      return;
    }
    if (amount > budgetUnits) {
      setError("Gebot übersteigt dein Budget");
      return;
    }
    setSaving(true);
    const amountCents = String(Math.round(amount * 100));
    const err = await onSubmit(amountCents);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-semibold text-card-text">Gebot versiegelt</p>
            <p className="text-sm text-card-text-secondary">
              Ergebnis nach Fristablauf. Du erfährst es hier im Markt.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-navy px-4 py-2 font-semibold text-white"
            >
              Schließen
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-bold text-card-text">
                  {playerName} <span className="text-xs text-card-text-secondary">({position})</span>
                </p>
                <p className="text-xs text-card-text-secondary">
                  Mindestpreis {formatUnits(minUnits)}
                </p>
              </div>
              <button onClick={onClose} className="text-card-text-secondary">
                ✕
              </button>
            </div>

            <p className="mb-3 inline-block rounded-full bg-field-yellow-bg px-2.5 py-1 text-xs font-semibold text-field-yellow-dark">
              {countdown}
            </p>

            <label className="mb-1 block text-sm text-card-text-secondary">Dein Gebot</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mb-2 w-full rounded-lg border border-navy-muted/30 px-3 py-2 text-card-text focus:border-play-blue focus:outline-none"
            />
            <div className="mb-3 flex gap-2">
              {[200_000, 500_000, 1_000_000].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => addQuick(delta)}
                  className="rounded-lg border border-play-blue px-2 py-1 text-xs font-semibold text-play-blue hover:bg-play-blue/10"
                >
                  +{delta >= 1_000_000 ? "1 Mio" : `${delta / 1000}k`}
                </button>
              ))}
            </div>

            <p
              className={`mb-3 text-sm ${budgetAfter < 0 ? "font-semibold text-field-red-light" : "text-card-text-secondary"}`}
            >
              Budget danach: {formatUnits(budgetAfter)}
            </p>

            {error && (
              <p className="mb-3 rounded-lg bg-field-yellow-bg px-3 py-2 text-sm text-field-red-dark">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full rounded-lg bg-navy px-4 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
            >
              {saving ? "Einen Moment…" : "Gebot abgeben"}
            </button>
            <p className="mt-3 text-xs text-card-text-secondary">
              Gebote sind verdeckt. Das höchste gültige Gebot gewinnt nach Fristablauf und zahlt
              genau seinen Betrag.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
