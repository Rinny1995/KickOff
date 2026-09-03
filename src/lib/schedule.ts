// Hilfsfunktionen rund um den echten NFL-Spielplan (NflGame-Tabelle).

export type TeamGameInfo = {
  opponent: string;
  isHome: boolean;
  kickoffAt: Date;
};

/** Team-Kürzel -> Gegner-Info für eine Woche. Teams ohne Eintrag haben Bye. */
export function buildOpponentMap(
  games: { homeTeam: string; awayTeam: string; kickoffAt: Date }[]
): Record<string, TeamGameInfo> {
  const map: Record<string, TeamGameInfo> = {};
  for (const g of games) {
    map[g.homeTeam] = { opponent: g.awayTeam, isHome: true, kickoffAt: g.kickoffAt };
    map[g.awayTeam] = { opponent: g.homeTeam, isHome: false, kickoffAt: g.kickoffAt };
  }
  return map;
}

/** Frühester Kickoff der Woche = Full-Lineup-Lock-Zeitpunkt. */
export function earliestKickoff(games: { kickoffAt: Date }[]): Date | null {
  if (games.length === 0) return null;
  return games.reduce((min, g) => (g.kickoffAt < min ? g.kickoffAt : min), games[0].kickoffAt);
}

const kickoffFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatKickoffBerlin(date: Date): string {
  return kickoffFormatter.format(date);
}

export function formatOpponentLabel(info: TeamGameInfo): string {
  const prefix = info.isHome ? "vs." : "@";
  return `${prefix} ${info.opponent}, ${formatKickoffBerlin(info.kickoffAt)}`;
}
