# KickOff – Produkt-Spezifikation V1

**App-Name (Arbeitsstand): "KickOff – Fantasy Football League"**
- Marke/Anzeigename: KickOff (im UI als normaler Schriftzug, keine
  Buchstaben-Spielereien)
- Untertitel/Erklärzeile: Fantasy Football League (rein beschreibend,
  rechtlich unkritisch; Markenprüfung vor echtem Launch durch Anwalt)
- Logo: K-Monogramm, dessen oberes Bein einen grünen Football
  wegkickt (gepunktete Flugbahn). Dateien: logo/kickoff-icon.svg
  (abgerundetes Quadrat, App-Icon) und logo/kickoff-icon-rund.svg
  (runde Variante für Avatare). Farben: Navy #013369, Weiß #F3F8FE,
  Ball-Grün #7DE0B8. Das NFL-Logo darf NIE verwendet werden.

Übergabe-Dokument für die Entwicklung mit Claude Code. Ergänzt das
bestehende Projektgerüst (Prisma-Schema, Spiellogik in src/lib/,
ANLEITUNG.md). Bei Widersprüchen gilt dieses Dokument.

## 1. Spielkonzept in einem Satz

Comunio-Prinzip (Budget, Transfermarkt mit verdeckten Geboten, tägliche
Marktwerte, Geld verdienen durch Trading und Wochenprämien) übertragen
auf die NFL mit Half-PPR-Scoring.

## 2. Regelwerk

### Kader & Aufstellung
- 9 Starter: QB, 2 RB, 2 WR, TE, FLEX (RB/WR/TE), K, DEF (Team-Defense)
- 7 Bankplätze, 2 IR-Plätze (nur für verletzte Spieler)
- Team-Defense, KEIN IDP-Format (entschieden)
- UI gruppiert nach Einheiten: Offense / Defense / Special Teams,
  jeweils als Ausklapp-Bereich (Offense standardmäßig offen)

### Liga-Start: zwei Modi (Auswahl bei Liga-Erstellung)
1. **Snake-Draft**: Reihenfolge wird zugelost, 16 Runden,
   **60 Sekunden pro Pick** (Liga-Einstellung), bei Zeitablauf
   Auto-Pick des besten verfügbaren Spielers nach Prognose-Rang.

   **Draft-Terminwahl (abgestimmt):**
   - Gründer gibt bei der Erstellung 1-2 Terminvorschläge an
     (Datum + Uhrzeit, z.B. zwei aufeinanderfolgende Tage).
   - Mitspieler stimmen im Liga-Tab ab, welcher Termin passt;
     dritte Option "Ich kann an beiden nicht".
   - Die finale Entscheidung trifft IMMER der Gründer; Termin bis
     zum Start änderbar. Countdown im Liga-Tab, Erinnerung an alle
     (Push in V2).
   - Wer nicht teilnimmt (abgestimmt "kann nicht" oder einfach
     abwesend): Team wird während des Drafts automatisch und FAIR
     aufgefüllt – gleicher Balancing-Algorithmus wie bei der
     Zulosung (Positionsbedarf + nahe am Liga-Durchschnitt), NICHT
     stumpf "bester verfügbarer Spieler pro Runde". Abwesende haben
     weder Vor- noch Nachteil.
   - Draft startet nur bei erreichter Mindest-Teamzahl (4); sonst
     schlägt die App dem Gründer Verschieben oder Wechsel auf
     Zulosung vor.
2. **Zulosung ("Draft überspringen")**: Kader werden automatisch fair
   zugelost, wie bei Comunio. Kein Termin nötig – Team kommt sofort
   beim Beitritt.

### Faire Zulosung (auch für Nachzügler)
- Ligen können mit wenigen Teams (min. 3-4) starten; Nachzügler
  können bis zu einem Stichtag beitreten.
- Algorithmus: Kader aus dem freien Spielerpool zusammenstellen, der
  (a) alle Positionsanforderungen erfüllt und (b) in Gesamt-
  Prognosepunkten und Marktwert nahe am Liga-Durchschnitt liegt.
- Liegt der zugeloste Kader unter dem Durchschnitt, erhält das Team
  anteilig mehr Startbudget als Ausgleich.

### Scoring (Half PPR, pro Liga anpassbar; Defaults in src/lib/scoring.ts)
- Passing: 1 Pkt / 25 Yards, 4 pro TD, -2 pro Interception
- Rushing/Receiving: 1 Pkt / 10 Yards, 6 pro TD, 0,5 pro Reception
- Fumble lost: -2 · Kicker: FG 3 / verschossen -1 / XP 1
- Defense: Sack 1, INT 2, TD 6, gestaffelte Punkte nach zugelassenen
  Gegner-Punkten (siehe scoring.ts)
- Punkte zählen für Ranglisten, sie sind KEIN Geld.

### Lineup-Lock (entschieden)
- **Full Lineup Lock**: Aufstellung friert beim ersten Kickoff der
  NFL-Woche komplett ein (i.d.R. Thursday Night Game, deutsche Zeit
  Nacht Do/Fr). Kein Tausch zwischen früh und spät angesetzten Spielen.
- Countdown prominent im Team-Screen ("Aufstellung fest ab Fr 02:15").
- Verletzung nach dem Lock = Pech, kein Sonderrecht.

### Wirtschaft
- Startbudget: 40 Mio (Cent-genau als BigInt, siehe leagueDefaults.ts)
- Marktwerte: täglicher Job, Mix 60 % Form (Punkteschnitt letzte 3
  Spiele) / 40 % Nachfrage, Wochenänderung gedeckelt auf ±10 %,
  Formel in src/lib/marketValue.ts
- Transfermarkt: verdeckte Gebote mit 24h-Frist. Höchstes gültiges
  Gebot gewinnt und zahlt seinen Gebotsbetrag; bei Gleichstand das
  frühere Gebot. Logik in src/lib/bids.ts
- Verkäufer kann der "Computer" (freier Markt) oder ein Mitspieler sein.

### Prämien (vorläufig – nach erster Testsaison überprüfen!)
- Wochenprämie Top 3 der Woche: 1 Mio / 500k / 250k
- Trader-Monatsprämie: 750k für die beste Teamwert-Entwicklung des Monats
- Saisonwertung: keine In-Game-Prämie (Gesamtsieg zählt für sich)

### Tabelle: drei Wertungen (umschaltbar)
1. Saison (Summe Wochenpunkte) – Standard
2. Wertentwicklung (Teamwert-Zuwachs seit Saisonstart)
3. Wochenwertung (Punkte der aktuellen Woche, zeigt Wochensieger)

## 3. Screens (Entwürfe im Chat abgestimmt)

### Transfermarkt (Tab 1)
- Kopf: Budget immer sichtbar
- Beobachtungsliste als horizontal wischbare Kartenreihe ganz oben:
  Name, Position, Wert, Wertveränderung der Woche. Auch Spieler
  aufnehmbar, die NICHT auf dem Markt sind.
- Suche, darunter Angebots-Karten: Positions-Badge, Name, NFL-Team,
  Punkteschnitt, Marktwert + Tagesveränderung (grün/rot), Countdown-
  Badge (gelb), Stern zum Beobachten (gefüllt/gelb = beobachtet),
  Status-Badge "dein Gebot liegt vor", Verkäufer-Hinweis bei
  Spieler-Verkäufen ("von Team Max"), Button Gebot abgeben/ändern.
- Später (V2): Push "beobachteter Spieler steht zum Verkauf".

### Mein Team (Tab 2)
- Kopf: Woche, Lock-Countdown, Punkte-Prognose
- Ausklapp-Bereiche: Offense (offen), Defense, Special Teams, Bank+IR
- Warn-Badges am zugeklappten Bereich (z.B. "1 Bye")
- Pro Spieler: Slot, Name, NFL-Team, **Gegner der Woche mit deutscher
  Anstoßzeit** ("vs. Green Bay, So 19:00" / "@ = auswärts"),
  Punkteschnitt
- **Matchup-Ampel**: leichter Gegner (grün) / schwerer Gegner (rot),
  berechnet aus abgegebenen Fantasy-Punkten der gegnerischen Defense
  an die jeweilige Position
- Bye-Spieler in Starter-Slots: gelbe Warnzeile + Tauschen-Button
- IR-Spieler: rote Zeile mit Verletzungsdetail ("Oberschenkel,
  fraglich Wo 6") aus der Datenquelle
- Tauschen: Slot antippen -> nur passende Bankspieler zur Auswahl

### Tabelle (Tab 3)
- Drei Sortier-Knöpfe (Saison / Wertentwicklung / Woche X), darunter
  Hinweiszeile zur jeweiligen Prämie
- Zeile: Platz (Platz 1 golden), Initialen-Avatar, Teamname,
  Wert der aktiven Wertung; eigenes Team farblich hervorgehoben
- Tipp auf Team -> dessen Kader/Aufstellung (transparent, nur Gebote
  sind geheim)

### Draft-Raum
- Kopf: Runde, Pick X von Y, eigene Picks-Zähler
- "Du bist dran!"-Banner (grün) mit 60s-Countdown, nächster Manager
- Ticker der letzten Picks
- Spielerliste: Suche, Positionsfilter-Chips, pro Spieler Prognose-
  Punkteschnitt und Prognose-Rang, Draften-Button
- Fußzeile: eigener bisheriger Kader

### Football-Einmaleins & App-Tour (für Neulinge, abgestimmt)
- Optionale Anleitung beim ersten Start für Leute ohne Football-Wissen:
  Was ist American Football (kurz, bildhaft), wie funktioniert Fantasy,
  was bedeuten die Positionen (QB, RB, WR, TE, K, DEF) – je Position
  eine Karte mit 1-2 Sätzen in einfacher Sprache.
- Jederzeit überspringbar ("Ich kenne mich aus").
- Unabhängig davon: geführte App-Tour durchs Menü beim ersten Start –
  jeder Tab (Markt, Team, Tabelle, Liga) wird einmal kurz erklärt
  (Spotlight/Tooltip-Prinzip). Auch diese Tour ist überspringbar und
  später in den Einstellungen erneut startbar.
- Football-Einmaleins zusätzlich dauerhaft im Liga-Tab unter "Hilfe"
  verlinkt.

### Liga-Sichtbarkeit (bei Gründung wählbar, abgestimmt)
- **Offen**: Liga erscheint in einer "Offene Ligen finden"-Liste
  (zeigt Name, freie Plätze, Modus); Fremde können direkt beitreten.
- **Mit Passwort**: Beitritt per Link + Kennwort.
- **Nur per Link** (Standard): Beitritt ausschließlich über den
  Einladungslink.
- Empfehlung Reihenfolge: Link/Passwort in V1, offene Ligen als
  V1.5/V2 (braucht Such-Screen, Melden-Funktion für Namen und ggf.
  Moderation, da fremde Nutzer aufeinandertreffen).
- Wichtig für offene Ligen: Umgang mit inaktiven Managern regeln –
  wer X Wochen keine Aufstellung pflegt, bekommt automatisch die
  beste verfügbare Aufstellung gesetzt (Autopilot), damit die Liga
  fair bleibt. Regeln/Prämien bleiben unverändert; Balance wie
  vereinbart nach erster Testsaison prüfen.

### Lade-Zustände (abgestimmt, reines CSS)
- **Huddle-Animation** für große Wartemomente (App-Start, Liga lädt
  erstmals): 8 Spieler-Punkte (Draufsicht) laufen von außen zu einem
  Kreis zusammen, in der Mitte erscheint der grüne Football, der
  Kreis "atmet" kurz (Spielzugbesprechung), dann bricht er auf –
  Loop ~3,4 s. Textzeile darunter: "Das Team bespricht den
  Spielzug…" mit pulsierenden Punkten.
- **Spiral-Ball-Spinner** für kurze Aktionen (Gebot abschicken,
  Anmelden, Pull-to-Refresh im Markt): der grüne Football rotiert
  um die eigene Achse wie ein Spiral-Pass.
- **Skeleton-Karten** für Listen (Markt, Tabelle, Kader): sanft
  pulsierende Platzhalter in Form der echten Karten, kein Spinner.
- Hierarchie strikt einhalten, damit sich nichts abnutzt; alle
  Animationen respektieren prefers-reduced-motion.

### Logo-Animationen (abgestimmt, reines CSS – keine Videodateien)
- **Lade-Animation (Login/App-Start)**: Der grüne Ball fliegt von
  unten links heran, als hätte das K ihn getreten – mit leichtem
  Überschwung (cubic-bezier), ~1,1 s, danach Ruheposition.
- **Field Goal (Erfolgs-Moment)**: Beim erfolgreichen Login blenden
  sich goldene Goalpost-Stangen über dem Logo ein, der Ball steigt
  rotierend hindurch, darunter erscheint "Field Goal! Willkommen
  zurück."
- Wiederverwendbar für weitere Erfolgs-Momente: gewonnenes Gebot,
  Wochensieg (V1 optional, spätestens V2).
- **Trikot-Animation bei gewonnenem Gebot (abgestimmt)**: Ein
  Spielblau-Trikot schwingt von oben ein und pendelt aus, dann
  erscheinen Nachname und Nummer (Nummer in Ball-Grün #7DE0B8),
  Konfetti in Grün/Gold/Weiß fällt. Meldung: "Deal! {Spieler}
  spielt jetzt für dich." + Kaufpreis + Schnellaktion "direkt
  aufstellen?" (führt in die Aufstellung). WICHTIG: Bei
  verlorenem Gebot KEINE Animation – nur nüchterne Meldung.
- Animationen respektieren die Systemeinstellung "Bewegung
  reduzieren" (prefers-reduced-motion: dann statisch einblenden).

### Solo-Modus (abgestimmt, V1)
- Liga gegen 3-11 Bot-Manager, wählbare Schwierigkeit:
  Rookie / Pro / Legende. Bots spielen nach identischen Regeln
  (gleiches Budget, echte Gebote, kein Blick in die Zukunft).
  Schwierigkeit steuert Aufstellungsqualität, Gebotsklugheit und
  Handelsaktivität.
- **NUR Draft-Modus** (keine Zulosung im Solo): Der Draft startet
  sofort nach Account-Erstellung bzw. auf Knopfdruck – kein Termin
  nötig, die Bots sind immer da.
- **Pausierbar**: Der Solo-Draft läuft ohne Pick-Uhr; der Spieler
  kann jederzeit unterbrechen und später weitermachen, die Bots
  warten. (Technisch: Draft-Zustand persistieren, Bot-Picks werden
  erst beim Fortsetzen nachgezogen.)
- Alle Liga-Regeln frei anpassbar, beliebig viele Solo-Ligen
  parallel – der Übungsplatz und das Regel-Labor.
- Saisonverlauf im Takt der echten NFL-Wochen (Punkte kommen aus
  echten Spielen). Später (V3-Idee): Saison-Simulation mit
  historischen Daten im eigenen Tempo.
- Solo-Modus dient auch als Onboarding: Wer ohne Liga-Einladung
  registriert, bekommt den Solo-Draft als ersten Vorschlag.

### Weitere Screens (Standard, ohne Detail-Entwurf)
- Login/Registrierung: E-Mail + Passwort, schlicht
- Liga erstellen: Name, Modus-Wahl (Draft / Zulosung), Standard-
  Einstellungen editierbar, Einladungslink erzeugen und teilen
- Liga beitreten: per Einladungslink, Teamname wählen
- Liga-Tab (Tab 4): Regeln/Prämien der Liga, Mitglieder,
  **Transferhistorie als Aktivitäts-Feed** ("Max hat Chase für
  19,5 Mio gekauft") – sozial wichtig!

### Gebots-Dialog (abgestimmt)
- Overlay mit: Spieler + Mindestpreis, Frist-Countdown (gelb),
  Betragseingabe, Schnellknöpfe (+200k / +500k / +1 Mio),
  Zeile "Budget danach" (wird rot bei Überziehung)
- Validierung mit freundlichen Inline-Fehlern: unter Mindestpreis /
  über Budget -> blockieren und erklären
- Nach Abgabe: Bestätigung "Gebot versiegelt – Ergebnis nach
  Fristablauf"
- Fußzeile erklärt die Regel bei jedem Gebot: verdeckt, höchstes
  gültiges Gebot gewinnt und zahlt seinen Betrag

### Spieler-Detailseite (abgestimmt, bewusst schlank)
- Kopf: Foto-Kreis (V1: Silhouetten-Platzhalter; echte Headshots ab
  V2 über die lizenzierte Daten-API – Spielerfotos sind
  rechtlich geschützt), Name, Position, NFL-Team, Fitness-Status,
  Marktwert + Veränderung seit Saisonstart
- Zwei Kennzahlen: Punkteschnitt, nächster Gegner mit Matchup-Ampel
- Navigationszeile "Statistiken" -> eigene Unterseite
- Letzte Spiele kompakt (Woche, Gegner, Punkte)
- Aktionen: Beobachten, Gebot abgeben. Kontextabhängig: nicht auf dem
  Markt -> Hinweis statt Gebots-Button; eigener Spieler ->
  "Verkaufen" plus Anzeige des eigenen Kaufpreises (Gewinn sichtbar)

### Spieler-Statistikseite (eigene Unterseite, abgestimmt)
- Steckbrief-Kacheln: Alter, NFL-Saison (Erfahrung), Punkte pro
  Spiel, Positions-Rang (z.B. "WR 4")
- Balkendiagramm: Punkte pro Spiel über die Saison
- Marktwert-Verlaufskurve (Saison)

## 4. Farbschema (final abgestimmt)

Grundidee: NFL-Schild-Navy als Bühne, helle Karten darauf ("dunkel im
Kern, hell außen" umgekehrt zur klassischen App – wirkt wie ein
eingebauter Dark Mode).

- **App-Hintergrund**: Navy `#013369` (Ton des NFL-Schild-Inneren;
  Farben sind nicht schutzfähig, das NFL-Logo selbst darf NIE
  verwendet werden)
- **Navigationsleiste unten**: dunkleres Navy `#02264C`,
  aktiver Tab `#5BA3F5`, inaktive Tabs `#6E86A8`
- **Kopfzeile**: direkt auf dem Navy-Hintergrund, Titel weiß,
  Untertitel `#A9C6E8`, Budget-Betrag in hellem Grün `#7DE0B8`
- **Inhaltskarten**: Eisblau `#F3F8FE`, Text `#16233A`,
  Sekundärtext `#5A6B84`
- **Positions-Badges** (QB/RB/WR/...): Spielblau `#1E6FD9` mit
  weißer Schrift
- **Primär-Buttons auf Karten** (Gebot abgeben usw.): Navy `#013369`
  mit weißer Schrift
- **Funktionsfarben** (unverändert wichtig!): Kurs steigt / leichter
  Gegner grün, Kurs fällt / schwerer Gegner rot, Fristen/Warnungen
  gelb; auf hellen Karten dunkle Töne (`#0F6E56`, `#A32D2D`,
  `#854F0B` auf `#FAEEDA`), auf Navy helle Töne (`#7DE0B8`)
- Optionale Idee für später: Spielblau-Karten (weiße Schrift) als
  Drama-Variante nur für besondere Momente wie Draft-Raum oder
  Wochensieger-Banner

## 5. Technische Ergänzungen zum bestehenden Schema

- NEU: Tabelle `WatchlistEntry` (teamId, playerId, createdAt,
  unique [teamId, playerId])
- League.settings erweitern um: draftMode ("snake" | "assigned"),
  pickTimeSeconds (Default 60), lineupLock ("first_kickoff"),
  traderMonthlyPrizeCents
- Spielplan-Daten (Gegner, Anstoßzeiten, Bye Weeks) über den
  Daten-Adapter beziehen; Zeiten in Europe/Berlin anzeigen
- Namensfilter: Team- und Liganamen beim Speichern gegen eine
  Sperrliste (deutsch + englisch) prüfen; Melden-Funktion für
  durchgerutschte Namen (spätestens mit offenen Ligen Pflicht)
- Player-Tabelle um optionale Felder erweitern: age, yearsPro,
  headshotUrl (bleibt in V1 leer, Platzhalter-Silhouette anzeigen)
- Matchup-Ampel: pro NFL-Defense laufender Schnitt der an jede
  Position abgegebenen Fantasy-Punkte

## 6. Roadmap-Erinnerung

- V1: alles oben, kostenlos (Sleeper-API, Vercel Free)
- V2: lizenzierte Daten-API, Live-Punkte, Push, Impressum/Datenschutz
- V3: Bezahlfunktion mit Gratis-Schalter (League.isPaid), App Stores
  via Capacitor

**Monetarisierung (Vorschlag, Entscheidung vor V3):**
- Grundprinzip: Kernspiel bleibt IMMER kostenlos (Liga, Markt,
  Punkte, Solo-Modus) – KEIN Pay-to-win, kein kaufbares Budget.
- **KickOff Pro** als Saison-Pass (passt zum NFL-Rhythmus Sep-Feb,
  z.B. einmalig pro Saison) oder kleines Monatsabo. Enthält:
  unbegrenzt viele Ligen parallel (Free: z.B. 2), Profi-Statistiken
  und Prognosen (erweiterte Matchup-Analysen, Marktwert-Trends),
  später die Saison-Simulation, kosmetische Extras (Trikotfarben,
  Profil), ggf. Werbefreiheit falls Free-Tier Werbung erhält.
- Gründer-Gratis-Schalter (dein Wunsch): Betreiber kann Pro-Features
  global oder pro Liga kostenlos freischalten (Aktionen, Familie,
  Testphasen).
- Zahlung primär über die Web-App (Stripe, ~2 % Gebühren) statt
  In-App-Kauf (15-30 % Store-Provision); in den Apps nur dort, wo
  die Store-Regeln es erzwingen.
- WICHTIG rechtlich: KEINE Echtgeld-Einsätze oder -Preisgelder in
  der App (Glücksspielrecht!). Prämien bleiben Spielgeld. Vor V3
  Anwalt für Markenanmeldung + Zahlungsmodell einbeziehen.

**Langfrist-Vision für KickOff Pro (Ideensammlung, nach V3):**
- **Eigene Team-Logos und Trikots**: Editor für Farben, Muster,
  Wappen – das Trikot erscheint dann überall (Tabelle, Kauf-
  Animation, Draft). Rein kosmetisch, niemals spielentscheidend.
- **Stadion-Kauf und -Ausbau**: Jedes Team kann mit SPIELGELD ein
  Stadion kaufen und über die Saisons ausbauen (Ränge, Flutlicht,
  Namensschild). Doppelter Nutzen: Prestige-Anzeige im Profil UND
  Geldsenke – zieht überschüssiges Prämien-Geld aus der Liga und
  entschärft damit die notierte Inflations-Sorge. Kein
  Gameplay-Vorteil durch Stadien.
- **Merchandising**: Echte Fanartikel (Shirts, Caps mit
  KickOff-Logo, später mit dem eigenen Team-Design des Nutzers via
  Print-on-Demand). Eigener Erlösstrom neben dem Saison-Pass;
  rechtlich unkritisch, solange nur eigene Designs verwendet
  werden (niemals NFL-Marken/Teamlogos).

## 7. Offene Punkte / Notizen

- Prämienhöhen nach erster Testsaison prüfen (Geldmenge in der Liga)
- Autodraft-Option für abwesende Manager (nice-to-have)
- Watchlist-Push in V2
- Stichtag für Nachzügler-Beitritt pro Liga festlegen (Vorschlag:
  bis Ende Woche 4)
