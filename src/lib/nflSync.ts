// Orchestriert die echte NFL-Datenanbindung: Spielplan laden, Wochen-Stats
// laden, daraus Punkte berechnen und Marktwerte aktualisieren.
//
// Läuft (noch) ohne echten Cron-Job – wird manuell per Skript ausgelöst
// (siehe package.json "sync:schedule" / "sync:week" / "sync:market").
// Für den Produktivbetrieb kann später ein Vercel-Cron dieselben
// Funktionen periodisch aufrufen.

import { prisma } from "./prisma";
import { nflData } from "./nflData";
import { calculatePoints, DEFAULT_SCORING, type ScoringConfig, type GameStats } from "./scoring";
import { nextDailyValue, DEFAULT_MARKET } from "./marketValue";
import { STARTER_SLOTS } from "./draft";

const SEED_MAX_VALUE_CENTS = 3_000_000_000n; // 30 Mio – Obergrenze für Top-Spieler
const SEED_MIN_VALUE_CENTS = 10_000_000n; // 100.000 – Untergrenze (wie marketValue.ts)
const SEED_DECAY = 60; // steuert, wie schnell der Anfangswert mit dem Rang abfällt

function initialValueFromRank(rank: number | undefined): bigint {
  if (rank === undefined) return SEED_MIN_VALUE_CENTS;
  const span = Number(SEED_MAX_VALUE_CENTS - SEED_MIN_VALUE_CENTS);
  const value = SEED_MIN_VALUE_CENTS + BigInt(Math.round(span * Math.exp(-rank / SEED_DECAY)));
  return value < SEED_MIN_VALUE_CENTS ? SEED_MIN_VALUE_CENTS : value;
}

/**
 * Aktualisiert den Spielerpool von Sleeper: neue Spieler (z.B. Rookies zur
 * neuen Saison) werden mit einem Anfangs-Marktwert angelegt, bestehende
 * Spieler bekommen nur Name/Team/Status aufgefrischt – ihr laufender
 * Marktwert bleibt unangetastet (den pflegt syncMarketValues()).
 */
export async function syncPlayerPool(): Promise<number> {
  const players = await nflData.fetchPlayers();
  for (const batch of chunk(players, 100)) {
    await Promise.all(
      batch.map((p) =>
        prisma.player.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            name: p.name,
            position: p.position,
            nflTeam: p.nflTeam,
            status: p.status,
            marketValue: initialValueFromRank(p.searchRank),
          },
          update: { name: p.name, nflTeam: p.nflTeam, status: p.status },
        })
      )
    );
  }
  return players.length;
}

const ALL_NFL_TEAMS = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB",
  "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
]);

/**
 * Lädt den echten Spielplan einer Woche und schreibt ihn in NflGame.
 * Setzt außerdem Player.status auf "bye" für Teams ohne Spiel in dieser
 * Woche, und zurück auf "active", sobald sie wieder spielen (verletzte
 * Spieler bleiben "injured" – das kommt separat von fetchPlayers()).
 */
export async function syncSchedule(season: number, week: number): Promise<void> {
  const games = await nflData.fetchWeekSchedule(season, week);

  await prisma.$transaction(
    games.map((g) =>
      prisma.nflGame.upsert({
        where: {
          season_week_homeTeam_awayTeam: {
            season,
            week,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
          },
        },
        create: { season, week, homeTeam: g.homeTeam, awayTeam: g.awayTeam, kickoffAt: g.kickoffAt },
        update: { kickoffAt: g.kickoffAt },
      })
    )
  );

  const playingTeams = new Set(games.flatMap((g) => [g.homeTeam, g.awayTeam]));
  const byeTeams = [...ALL_NFL_TEAMS].filter((t) => !playingTeams.has(t));

  if (byeTeams.length > 0) {
    await prisma.player.updateMany({
      where: { nflTeam: { in: byeTeams }, status: { notIn: ["injured", "ir"] } },
      data: { status: "bye" },
    });
  }
  if (playingTeams.size > 0) {
    await prisma.player.updateMany({
      where: { nflTeam: { in: [...playingTeams] }, status: "bye" },
      data: { status: "active" },
    });
  }
}

/** Aktualisiert Fitness-Status (verletzt/aktiv) aller Spieler frisch von Sleeper. */
export async function syncPlayerStatuses(): Promise<void> {
  const players = await nflData.fetchPlayers();
  const chunks = chunk(players, 100);
  for (const c of chunks) {
    await Promise.all(
      c.map((p) =>
        prisma.player.updateMany({
          where: { id: p.id, status: { not: "bye" } }, // Bye-Status kommt aus syncSchedule
          data: { status: p.status, nflTeam: p.nflTeam },
        })
      )
    );
  }
}

/**
 * Lädt echte Wochen-Stats, schreibt sie als PlayerGameStats, berechnet
 * daraus für jedes Team in jeder Liga dieser Saison die Aufstellungs-
 * Punkte (mit der jeweiligen Liga-Scoring-Konfiguration) und aktualisiert
 * die Wochen-Tabelle inkl. Prämien-Gutschrift.
 */
// Puffer nach dem letzten Kickoff der Woche, bevor sie als "vorbei" gilt
// und Platzierung + Prämien final vergeben werden – ein Spiel (inkl.
// Verlängerung) dauert nie länger als das.
const WEEK_CONCLUDED_BUFFER_HOURS = 6;

async function isWeekConcluded(season: number, week: number): Promise<boolean> {
  const games = await prisma.nflGame.findMany({ where: { season, week }, select: { kickoffAt: true } });
  if (games.length === 0) return false; // Spielplan noch nicht geladen -> nichts final
  const lastKickoff = games.reduce((max, g) => (g.kickoffAt > max ? g.kickoffAt : max), games[0].kickoffAt);
  return Date.now() >= lastKickoff.getTime() + WEEK_CONCLUDED_BUFFER_HOURS * 60 * 60 * 1000;
}

export async function syncWeekStats(season: number, week: number): Promise<void> {
  const statsMap = await nflData.fetchWeekStats(season, week);
  // Punkte dürfen jederzeit als laufende Vorschau aktualisiert werden, aber
  // Platzierung und Wochenprämien erst, wenn die Woche wirklich vorbei ist
  // – sonst würde z.B. der Dienstags-Lauf des Cron-Jobs schon Geld für eine
  // Woche auszahlen, die noch gar nicht gespielt wurde.
  const concluded = await isWeekConcluded(season, week);

  const playerIds = [...statsMap.keys()];
  const existingPlayers = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true },
  });
  const knownIds = new Set(existingPlayers.map((p) => p.id));

  const rows = [...statsMap.entries()].filter(([id]) => knownIds.has(id));
  for (const batch of chunk(rows, 100)) {
    await Promise.all(
      batch.map(([playerId, stats]) =>
        prisma.playerGameStats.upsert({
          where: { playerId_season_week: { playerId, season, week } },
          create: { playerId, season, week, ...stats },
          update: { ...stats },
        })
      )
    );
  }

  const leagues = await prisma.league.findMany({
    where: { season },
    include: { teams: { include: { lineups: { where: { season, week } } } } },
  });

  for (const league of leagues) {
    const scoring = (league.settings as { scoring?: ScoringConfig }).scoring ?? DEFAULT_SCORING;
    const weeklyPrizesCents = (league.settings as { weeklyPrizesCents?: string[] }).weeklyPrizesCents ?? [
      "0",
      "0",
      "0",
    ];

    const teamPoints: { teamId: string; points: number }[] = [];

    for (const team of league.teams) {
      const lineup = team.lineups[0];
      if (!lineup) continue;

      const slots = lineup.slots as Record<string, string>;
      let points = 0;
      for (const slot of STARTER_SLOTS) {
        const playerId = slots[slot];
        if (!playerId) continue;
        const stats = statsMap.get(playerId);
        if (stats) points += calculatePoints(stats, scoring);
      }
      points = Math.round(points * 10) / 10;

      await prisma.lineup.update({ where: { id: lineup.id }, data: { points } });
      teamPoints.push({ teamId: team.id, points });
    }

    if (!concluded) continue; // Punkte-Vorschau aktualisiert, Prämien warten noch

    teamPoints.sort((a, b) => b.points - a.points);

    for (let i = 0; i < teamPoints.length; i++) {
      const placement = i + 1;
      const prize = placement <= 3 ? BigInt(weeklyPrizesCents[placement - 1] ?? "0") : 0n;
      const { teamId, points } = teamPoints[i];

      const previous = await prisma.weeklyResult.findUnique({
        where: { teamId_season_week: { teamId, season, week } },
      });
      const prizeDelta = prize - (previous?.prize ?? 0n);

      await prisma.$transaction([
        prisma.weeklyResult.upsert({
          where: { teamId_season_week: { teamId, season, week } },
          create: { teamId, season, week, points, placement, prize },
          update: { points, placement, prize },
        }),
        ...(prizeDelta !== 0n
          ? [prisma.team.update({ where: { id: teamId }, data: { budget: { increment: prizeDelta } } })]
          : []),
      ]);
    }
  }
}

/**
 * Täglicher Marktwert-Job: Form (Punkteschnitt der letzten 3 Spiele nach
 * neutraler Standard-Wertung) + Nachfrage (aktive Gebote/Beobachtungen der
 * letzten 7 Tage). Marktwerte sind ligaübergreifend, deshalb neutrale
 * Standard-Wertung statt einer einzelnen Liga-Konfiguration.
 */
export async function syncMarketValues(season: number, throughWeek: number): Promise<void> {
  const players = await prisma.player.findMany({ select: { id: true, marketValue: true } });
  const weeks = [throughWeek - 2, throughWeek - 1, throughWeek].filter((w) => w >= 1);

  const recentStats = await prisma.playerGameStats.findMany({
    where: { season, week: { in: weeks } },
  });
  const statsByPlayer = new Map<string, GameStats[]>();
  for (const s of recentStats) {
    const list = statsByPlayer.get(s.playerId) ?? [];
    list.push(s);
    statsByPlayer.set(s.playerId, list);
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [bidCounts, watchCounts] = await Promise.all([
    prisma.bid.groupBy({
      by: ["listingId"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.watchlistEntry.groupBy({
      by: ["playerId"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
  ]);
  const listingToPlayer = await prisma.listing.findMany({
    where: { id: { in: bidCounts.map((b) => b.listingId) } },
    select: { id: true, playerId: true },
  });
  const listingPlayerMap = new Map(listingToPlayer.map((l) => [l.id, l.playerId]));
  const bidTeamsByPlayer = new Map<string, number>();
  for (const b of bidCounts) {
    const playerId = listingPlayerMap.get(b.listingId);
    if (!playerId) continue;
    bidTeamsByPlayer.set(playerId, (bidTeamsByPlayer.get(playerId) ?? 0) + b._count);
  }
  const watchByPlayer = new Map(watchCounts.map((w) => [w.playerId, w._count]));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const batch of chunk(players, 100)) {
    await Promise.all(
      batch.map(async (player) => {
        const games = statsByPlayer.get(player.id) ?? [];
        const avgPoints =
          games.length > 0
            ? games.reduce((s, g) => s + calculatePoints(g, DEFAULT_SCORING), 0) / games.length
            : DEFAULT_MARKET.baselinePoints; // keine Daten -> neutral, nur Nachfrage zählt

        const demandScore = Math.min(
          100,
          (bidTeamsByPlayer.get(player.id) ?? 0) * 40 + (watchByPlayer.get(player.id) ?? 0) * 10
        );

        const newValue = nextDailyValue(player.marketValue, avgPoints, demandScore);
        if (newValue === player.marketValue) return;

        await prisma.$transaction([
          prisma.player.update({ where: { id: player.id }, data: { marketValue: newValue } }),
          prisma.marketValueHistory.upsert({
            where: { playerId_date: { playerId: player.id, date: today } },
            create: { playerId: player.id, date: today, value: newValue },
            update: { value: newValue },
          }),
        ]);
      })
    );
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
