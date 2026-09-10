import Link from "next/link";

export const metadata = { title: "Impressum – KickOff" };

export default function ImpressumPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/" className="text-sm text-subtitle">
          ← Zurück
        </Link>
        <h1 className="text-xl font-bold text-white">Impressum</h1>

        <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 text-sm text-card-text-secondary shadow-xl">
          <section>
            <h2 className="mb-1 font-semibold text-card-text">Angaben gemäß § 5 DDG</h2>
            <p>
              Rene Hindriks
              <br />
              Buschkamp 36
              <br />
              48527 Nordhorn
              <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">Kontakt</h2>
            <p>
              E-Mail:{" "}
              <a href="mailto:hindriks@gmx.net" className="underline">
                hindriks@gmx.net
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">Haftung für Inhalte</h2>
            <p>
              KickOff ist ein privates, nicht-kommerzielles Hobby-Projekt. Echte NFL-Daten
              (Spielplan, Statistiken, Marktwerte) stammen von öffentlichen Drittanbieter-APIs
              (Sleeper, ESPN) und werden ohne Gewähr auf Richtigkeit, Vollständigkeit oder
              Aktualität übernommen.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">Kein Echtgeld</h2>
            <p>
              Budget und "Prämien" innerhalb von KickOff sind reine Spielwährung ohne echten
              Geldwert. Es findet keinerlei Geldtransfer über die App statt.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-card-text">Streitbeilegung</h2>
            <p>
              Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
