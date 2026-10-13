import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./league-theme.css";
export const metadata: Metadata = {
  title: "Forecast League — Pronosticá. Competí. Repetí.",
  description:
    "Anticipá el futuro. Competí con amigos. Descubrí qué piensa la comunidad. Una plataforma social de pronósticos.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#CC7722",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
