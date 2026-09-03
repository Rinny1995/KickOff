import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KickOff – Fantasy Football League",
  description: "Fantasy Football League",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
