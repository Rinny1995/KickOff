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
        card: "#F3F8FE", // Inhaltskarten
        "card-text": "#16233A",
        "card-text-secondary": "#5A6B84",
        "play-blue": "#1E6FD9", // Positions-Badges, Primär-Buttons auf Navy
        "field-green-dark": "#0F6E56", // Funktionsfarbe grün auf Karten
        "field-red-dark": "#A32D2D", // Funktionsfarbe rot auf Karten
        "field-yellow-dark": "#854F0B", // Funktionsfarbe gelb auf Karten
        "field-yellow-bg": "#FAEEDA",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
