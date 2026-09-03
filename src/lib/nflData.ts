// NFL-Daten-Adapter – die austauschbare Schicht zur Außenwelt.
// V1 nutzt die kostenlose öffentliche Sleeper-API.
// Für den Launch schreiben wir einen zweiten Adapter (z.B. FantasyData)
// mit exakt derselben Schnittstelle – der Rest der App merkt nichts davon.

import type { GameStats } from "./scoring";

export type NflPlayer = {
  id: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
  nflTeam: string;
  status: string;
  // Fantasy-Relevanz-Rang von Sleeper (1 = wertvollster Spieler). Dient nur
  // als Startpunkt für den allerersten Marktwert, bevor eigene Saisondaten
  // vorliegen. Fehlt bei irrelevanten Spielern.
  searchRank?: number;
};

export type NflGameInfo = {
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
};

export interface NflDataAdapter {
  /** Alle aktiven NFL-Spieler (für den Spielerpool). */
  fetchPlayers(): Promise<NflPlayer[]>;
  /** Stats aller Spieler für eine Woche (nach dem Spieltag). */
  fetchWeekStats(season: number, week: number): Promise<Map<string, GameStats>>;
  /** Wer spielt wann gegen wen in dieser Woche (Gegner, Anstoßzeit, Bye Weeks). */
  fetchWeekSchedule(season: number, week: number): Promise<NflGameInfo[]>;
}

const SLEEPER = "https://api.sleeper.app/v1";
const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

// Sleeper nutzt eigene Team-Kürzel; an den paar Stellen, wo sie von ESPNs
// Kürzeln abweichen, hier abgleichen (bisher bekannt: Washington).
const ESPN_TO_SLEEPER_TEAM: Record<string, string> = {
  WSH: "WAS",
};

function normalizeTeam(espnAbbr: string): string {
  return ESPN_TO_SLEEPER_TEAM[espnAbbr] ?? espnAbbr;
}

export class SleeperAdapter implements NflDataAdapter {
  async fetchPlayers(): Promise<NflPlayer[]> {
    const res = await fetch(`${SLEEPER}/players/nfl`);
    const data: Record<string, any> = await res.json();
    return Object.values(data)
      .filter(p => p.active && FANTASY_POSITIONS.has(p.position))
      .map(p => ({
        id: String(p.player_id),
        name: p.full_name ?? `${p.first_name} ${p.last_name}`,
        position: p.position,
        nflTeam: p.team ?? "FA",
        status: p.injury_status ? "injured" : "active",
        searchRank: typeof p.search_rank === "number" ? p.search_rank : undefined,
      }));
  }

  async fetchWeekStats(season: number, week: number): Promise<Map<string, GameStats>> {
    const res = await fetch(`${SLEEPER}/stats/nfl/regular/${season}/${week}`);
    const data: Record<string, any> = await res.json();
    const map = new Map<string, GameStats>();
    for (const [playerId, s] of Object.entries<any>(data)) {
      map.set(playerId, {
        passYards: s.pass_yd ?? 0,
        passTds: s.pass_td ?? 0,
        interceptions: s.pass_int ?? 0,
        rushYards: s.rush_yd ?? 0,
        rushTds: s.rush_td ?? 0,
        recYards: s.rec_yd ?? 0,
        recTds: s.rec_td ?? 0,
        receptions: s.rec ?? 0,
        fumblesLost: s.fum_lost ?? 0,
        fgMade: s.fgm ?? 0,
        fgMissed: s.fgmiss ?? 0,
        xpMade: s.xpm ?? 0,
        defSacks: s.sack ?? 0,
        defInts: s.int ?? 0,
        defTds: s.def_td ?? 0,
        defPointsAllowed: s.pts_allow ?? 0,
      });
    }
    return map;
  }

  // Sleeper liefert keinen echten Spielplan (nur Fantasy-eigene Daten).
  // Für Gegner, Anstoßzeiten und Bye Weeks nutzen wir deshalb zusätzlich
  // ESPNs kostenlose, öffentliche Scoreboard-API (kein Schlüssel nötig).
  async fetchWeekSchedule(season: number, week: number): Promise<NflGameInfo[]> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`;
    const res = await fetch(url);
    const data: any = await res.json();
    return (data.events ?? []).map((event: any) => {
      const competitors = event.competitions[0].competitors;
      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");
      return {
        homeTeam: normalizeTeam(home.team.abbreviation),
        awayTeam: normalizeTeam(away.team.abbreviation),
        kickoffAt: new Date(event.date),
      };
    });
  }
}

export const nflData: NflDataAdapter = new SleeperAdapter();
