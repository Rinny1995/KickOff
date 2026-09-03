// Füllt den Spielerpool einmalig mit echten, aktiven NFL-Spielern von der
// kostenlosen Sleeper-API. Ausführen mit: npm run db:seed
//
// Die eigentliche Logik steckt in src/lib/nflSync.ts (syncPlayerPool), die
// auch beim Saisonwechsel erneut aufgerufen wird, um neue Rookies in den
// Pool zu holen.

import { syncPlayerPool } from "../src/lib/nflSync";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Lade aktive NFL-Spieler von Sleeper…");
  const count = await syncPlayerPool();
  console.log(`Fertig: ${count} Spieler im Pool.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
