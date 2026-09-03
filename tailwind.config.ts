import type { Config } from "tailwindcss";

// Farbschema aus SPEZIFIKATION.md Abschnitt 4 – final abgestimmt.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#013369", // App-Hintergrund
        "navy-dark": "#02264C", // Navigationsleiste unten
        "navy-light": "#5BA3F5", // aktiver Tab
        "navy-muted": "#6E86A8", // inaktive Tabs
        subtitle: "#A9C6E8", // Untertitel in Kopfzeile
        "ball-green": "#7DE0B8", // Budget-Betrag, Akzente auf Navy
        card: "#0B2545", // Inhaltskarten – tiefes Marineblau
        "card-text": "#F3F8FE", // hell, damit auf dem dunklen Karten-Hintergrund lesbar
        "card-text-secondary": "#A9C6E8",
        "play-blue": "#1E6FD9", // Positions-Badges, Primär-Buttons auf Navy
        "field-green-dark": "#0F6E56", // Funktionsfarbe grün – auf hellen Flächen (z.B. gelbe Chips)
        "field-red-dark": "#A32D2D", // Funktionsfarbe rot – auf hellen Flächen
        "field-yellow-dark": "#854F0B", // Funktionsfarbe gelb – auf hellen Flächen
        "field-yellow-bg": "#FAEEDA",
        "field-red-light": "#FF8A80", // Funktionsfarbe rot – direkt auf der (dunklen) Karte
        "field-yellow-light": "#FCD34D", // Funktionsfarbe gelb – direkt auf der (dunklen) Karte
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
