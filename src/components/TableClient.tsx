"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type StandingRow = {
  teamId: string;
  teamName: string;
  isOwnTeam: boolean;
  seasonPoints: number;
  weekPoints: number;
  valueGrowthCents: string; // kann negativ sein
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatUnits(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function formatCents(cents: string): string {
  const n = Number(cents) / 100;
  const sign = n > 0 ? "+" : "";
  return sign + n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

type Sort = "season" | "growth" | "week";

export function TableClient({
  rows,
  currentWeek,
  weeklyPrizesCents,
  traderMonthlyPrizeCents,
}: {
  rows: StandingRow[];
  currentWeek: number;
  weeklyPrizesCents: string[];
  traderMonthlyPrizeCents: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("season");

  const sorted = [...rows].sort((a, b) => {
    if (sort === "season") return b.seasonPoints - a.seasonPoints;
    if (sort === "week") return b.weekPoints - a.weekPoints;
    return Number(BigInt(b.valueGrowthCents) - BigInt(a.valueGrowthCents));
  });

  const prizeHint =
    sort === "season"
      ? "Saisonwertung: keine Extra-Prämie – der Gesamtsieg zählt für sich."
      : sort === "week"
        ? `Wochenprämie Top 3: ${formatUnits(Number(weeklyPrizesCents[0]) / 100)} / ${formatUnits(Number(weeklyPrizesCents[1]) / 100)} / ${formatUnits(Number(weeklyPrizesCents[2]) / 100)}`
        : `Beste Wertentwicklung des Monats: ${formatUnits(Number(traderMonthlyPrizeCents) / 100)} Prämie`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => setSort("season")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${sort === "season" ? "bg-navy text-white" : "bg-card text-card-text"}`}
        >
          Saison
        </button>
        <button
          onClick={() => setSort("growth")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${sort === "growth" ? "bg-navy text-white" : "bg-card text-card-text"}`}
        >
          Wertentwicklung
        </button>
        <button
          onClick={() => setSort("week")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${sort === "week" ? "bg-navy text-white" : "bg-card text-card-text"}`}
        >
          Woche {currentWeek}
        </button>
      </div>

      <p className="rounded-lg bg-card px-3 py-2 text-xs text-card-text-secondary shadow-xl">
        {prizeHint}
      </p>

      <div className="overflow-hidden rounded-2xl bg-card shadow-xl">
        {sorted.map((row, i) => {
          const place = i + 1;
          const value =
            sort === "season"
              ? `${formatUnits(row.seasonPoints)} Pkt`
              : sort === "week"
                ? `${formatUnits(row.weekPoints)} Pkt`
                : `${formatCents(row.valueGrowthCents)}`;
          return (
            <button
              key={row.teamId}
              onClick={() => router.push(`/team/${row.teamId}`)}
              className={`flex w-full items-center gap-3 border-b border-navy-muted/15 px-4 py-3 text-left last:border-0 ${
                row.isOwnTeam ? "bg-play-blue/10" : ""
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  place === 1 ? "bg-[#E8C547] text-navy" : "bg-navy-muted/20 text-card-text-secondary"
                }`}
              >
                {place}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-play-blue text-xs font-bold text-white">
                {initials(row.teamName)}
              </span>
              <span className="flex-1 truncate font-medium text-card-text">{row.teamName}</span>
              <span className="shrink-0 text-sm font-semibold text-card-text">{value}</span>
            </button>
          );
        })}
      </div>

      {(sort === "season" || sort === "week") && (
        <p className="rounded-lg bg-field-yellow-bg px-3 py-2 text-xs text-field-yellow-dark">
          Echte Punkte kommen, sobald der NFL-Spielplan und die Ergebnisse angebunden sind – bis
          dahin steht hier 0.
        </p>
      )}
    </div>
  );
}
