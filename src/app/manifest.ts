import type { MetadataRoute } from "next";

// Macht KickOff auf dem Handy "installierbar" (Homescreen-Icon,
// Vollbildmodus ohne Browserleiste) – ganz ohne App Store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KickOff – Fantasy Football League",
    short_name: "KickOff",
    description: "Comunio-Prinzip trifft NFL: Liga mit Freunden, Transfermarkt, echte Punkte.",
    start_url: "/",
    display: "standalone",
    background_color: "#013369",
    theme_color: "#013369",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
