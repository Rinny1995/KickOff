import Link from "next/link";

export const metadata = { title: "Datenschutz – KickOff" };

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/" className="text-sm text-subtitle">
          ← Zurück
        </Link>
        <h1 className="text-xl font-bold text-white">Datenschutzerklärung</h1>

        <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 text-sm text-card-text-secondary shadow-xl">
          <section>
            <h2 className="mb-1 font-semibold text-card-text">1. Verantwortlicher</h2>
            <p>
              Rene Hindriks
              <br />
              Buschkamp 36, 48527 Nordhorn
              <br />
              E-Mail:{" "}
              <a href="mailto:hindriks@gmx.net" className="underline">
                hindriks@gmx.net
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">2. Welche Daten wir speichern</h2>
            <p className="mb-2">Bei der Registrierung und Nutzung von KickOff verarbeiten wir:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>E-Mail-Adresse und Teamname/Anzeigename (zur Anmeldung und Identifikation)</li>
              <li>
                Passwort – wird ausschließlich als Hash (bcrypt) gespeichert, niemals im
                Klartext
              </li>
              <li>Liga- und Team-Daten: Ligazugehörigkeit, Kader, Gebote, Aufstellungen, Tabellenstände</li>
              <li>Freiwillig eingereichtes Feedback über das Feedback-Formular</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">3. Rechtsgrundlage</h2>
            <p>
              Die Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b
              DSGVO) – ohne diese Daten kann KickOff nicht funktionieren (z.B. kein Login, kein
              Kader ohne Konto).
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">4. Cookies</h2>
            <p>
              KickOff setzt genau ein Cookie: ein technisch notwendiges Sitzungs-Cookie
              (verschlüsseltes JWT, "httpOnly"), um dich eingeloggt zu halten. Es dient
              ausschließlich der Anmeldung, keinem Tracking oder Werbezwecken, und benötigt daher
              nach § 25 Abs. 2 TTDSG keine gesonderte Einwilligung.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">5. Hosting</h2>
            <p>
              Die App läuft auf Vercel (Vercel Inc., USA). Dabei können Anfragen technisch über
              Server außerhalb der EU verarbeitet werden; Vercel hat sich über
              EU-Standardvertragsklauseln zur Einhaltung des europäischen Datenschutzniveaus
              verpflichtet. Die Datenbank (alle gespeicherten Nutzer- und Spieldaten) liegt bei
              Neon mit Serverstandort Frankfurt (EU).
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">6. Keine Weitergabe, kein Tracking</h2>
            <p>
              Wir setzen keine Analyse- oder Werbe-Tools ein und geben keine Daten zu
              Werbezwecken an Dritte weiter. Für aktuelle NFL-Spieldaten (Spielplan, Statistiken)
              fragen wir öffentliche APIs (Sleeper, ESPN) ab – dabei werden keine deiner
              persönlichen Daten übermittelt.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">7. Speicherdauer</h2>
            <p>
              Deine Daten bleiben gespeichert, solange dein Konto besteht. Auf Anfrage per E-Mail
              löschen wir dein Konto und alle zugehörigen Daten.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">8. Deine Rechte</h2>
            <p>
              Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
              Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dafür einfach per
              E-Mail an uns. Außerdem hast du das Recht, dich bei einer
              Datenschutz-Aufsichtsbehörde zu beschweren.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">9. Mindestalter</h2>
            <p>
              KickOff richtet sich an Nutzer ab 16 Jahren. Jüngere Personen benötigen die
              Zustimmung eines Erziehungsberechtigten.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
