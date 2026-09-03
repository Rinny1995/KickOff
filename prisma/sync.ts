// Manueller Auslöser für die echte NFL-Datenanbindung. Später kann ein
// echter Cron-Job (z.B. Vercel Cron) dieselben Funktionen periodisch
// aufrufen, statt dass jemand dieses Skript von Hand startet.
//
// Verwendung:
//   npx tsx prisma/sync.ts schedule <saison> <woche>
//   npx tsx prisma/sync.ts stats    <saison> <woche>
//   npx tsx prisma/sync.ts market   <saison> <bis-woche>
//   npx tsx prisma/sync.ts players

import { syncSchedule, syncWeekStats, syncMarketValues, syncPlayerStatuses } from "../src/lib/nflSync";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [cmd, seasonArg, weekArg] = process.argv.slice(2);
  const season = Number(seasonArg);
  const week = Number(weekArg);

  switch (cmd) {
    case "schedule":
      console.log(`Lade Spielplan ${season} Woche ${week}…`);
      await syncSchedule(season, week);
      console.log("Fertig.");
      break;
    case "stats":
      console.log(`Lade Wochen-Stats ${season} Woche ${week} und berechne Punkte…`);
      await syncWeekStats(season, week);
      console.log("Fertig.");
      break;
    case "market":
      console.log(`Aktualisiere Marktwerte (Saison ${season}, bis Woche ${week})…`);
      await syncMarketValues(season, week);
      console.log("Fertig.");
      break;
    case "players":
      console.log("Aktualisiere Fitness-Status aller Spieler…");
      await syncPlayerStatuses();
      console.log("Fertig.");
      break;
    default:
      console.error("Unbekannter Befehl. Nutze: schedule | stats | market | players");
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
