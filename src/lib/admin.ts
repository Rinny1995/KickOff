// Betreiber-Erkennung für den Admin-Bereich (/admin, /feedback-Auswertung).
// Bewusst simpel gehalten: KickOff hat genau einen Betreiber, keine Rollen-
// Verwaltung nötig.

const ADMIN_EMAIL = "hindriks@gmx.net";

export function isAdmin(user: { email: string } | null | undefined): boolean {
  return user?.email === ADMIN_EMAIL;
}
