# KickOff – Deine Anleitung

Willkommen! Dieses Paket ist der Grundstein deiner Fantasy-App. Du musst
den Code nicht verstehen – diese Anleitung führt dich durch alles.

## Was ist hier drin?

- **prisma/schema.prisma** – der Bauplan der Datenbank (Nutzer, Ligen,
  Teams, Spieler, Transfermarkt, Gebote, Draft)
- **src/lib/scoring.ts** – die Punkteberechnung (Half PPR, wie im
  Balance-Tester abgestimmt)
- **src/lib/marketValue.ts** – die tägliche Marktwert-Berechnung
- **src/lib/bids.ts** – die Auflösung verdeckter Gebote
- **src/lib/draft.ts** – Snake-Draft und Kader-Regeln
- **src/lib/nflData.ts** – die Verbindung zu echten NFL-Daten (kostenlose
  Sleeper-API, später austauschbar gegen eine lizenzierte)
- **src/lib/leagueDefaults.ts** – Standard-Einstellungen neuer Ligen

## Deine nächsten Schritte (einmalig, alles kostenlos)

1. **Node.js installieren** – das ist die Software, mit der das Projekt
   läuft. Gehe auf https://nodejs.org und lade die "LTS"-Version herunter.
   Installieren wie jedes normale Programm.

2. **Claude Code installieren** – damit kann Claude direkt in diesem
   Projekt weiterarbeiten, Fehler selbst finden und beheben. Anleitung:
   https://docs.claude.com/de/docs/claude-code

3. **Projekt öffnen** – entpacke diesen Ordner an einen Ort deiner Wahl
   (z.B. Dokumente/kickoff) und öffne dort Claude Code.

Ab da übernimmt Claude wieder: Als Nächstes bauen wir die Oberfläche
(Anmeldung, Liga erstellen, Draft-Raum, Transfermarkt) und verbinden
alles mit einer Datenbank.

## Die wichtigsten Entscheidungen (bereits eingebaut)

- Geld wird als Ganzzahl in Cent gespeichert – keine Rundungsfehler.
- Jede Liga hat eigene Einstellungen (Scoring, Budget, Prämien) – dein
  späterer "Gratis-Schalter" (isPaid) ist schon im Schema angelegt.
- Die NFL-Datenquelle ist eine austauschbare Steckdose: Entwicklung
  kostenlos über Sleeper, Launch später über eine lizenzierte API,
  ohne dass der Rest der App angefasst werden muss.
- Startbudget 40 Mio, Wochenprämien 1 Mio / 500k / 250k für die Top 3 –
  alles anpassbar, wir testen die Balance im Spielbetrieb.
