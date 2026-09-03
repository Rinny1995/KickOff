import { NextResponse } from "next/server";
import { currentNflSeason, currentNflWeek } from "@/lib/nflWeek";
import { syncSchedule, syncPlayerStatuses, syncWeekStats, syncMarketValues } from "@/lib/nflSync";

// Täglicher Cron-Job (siehe vercel.json). Hält Spielplan, Fitness-Status,
// Wochen-Punkte und Marktwerte für alle Ligen aktuell – ersetzt das manuelle
// `npm run sync`. Läuft nur auf echten Cron-Aufruf, gesichert per CRON_SECRET
// (Vercel schickt dieses Secret automatisch als Bearer-Token mit, siehe
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

export const maxDuration = 300; // Sekunden – der Marktwert-Job läuft über alle Spieler
// Nie statisch cachen/vorrendern – jeder Aufruf muss wirklich neu laufen.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const season = currentNflSeason();
  const week = currentNflWeek(season);
  const results: Record<string, string> = {};

  try {
    await syncPlayerStatuses();
    results.players = "ok";
  } catch (err) {
    results.players = `error: ${(err as Error).message}`;
  }

  for (const w of [week, week + 1]) {
    try {
      await syncSchedule(season, w);
      results[`schedule_week_${w}`] = "ok";
    } catch (err) {
      results[`schedule_week_${w}`] = `error: ${(err as Error).message}`;
    }
  }

  // Auch die Vorwoche nochmal ziehen – Nachzügler-Stats (z.B. Montagabend-
  // Spiel) und Korrekturen landen teils erst danach.
  for (const w of [Math.max(1, week - 1), week]) {
    try {
      await syncWeekStats(season, w);
      results[`stats_week_${w}`] = "ok";
    } catch (err) {
      results[`stats_week_${w}`] = `error: ${(err as Error).message}`;
    }
  }

  try {
    await syncMarketValues(season, week);
    results.market = "ok";
  } catch (err) {
    results.market = `error: ${(err as Error).message}`;
  }

  return NextResponse.json({ season, week, results });
}
