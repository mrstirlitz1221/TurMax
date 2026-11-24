import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_URL } from "@/lib/format";

const sans = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const display = Playfair_Display({ subsets: ["latin", "cyrillic"], variable: "--font-display-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TurMax — Открой Кыргызстан", template: "%s · TurMax" },
  description:
    "Туристический портал Кыргызстана: направления, достопримечательности, маршруты и туры, интерактивная карта и конструктор поездки с расчётом стоимости.",
  openGraph: { type: "website", locale: "ru_RU", siteName: "TurMax" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#1d3a2c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[2000] focus:bg-white focus:px-4 focus:py-2">
          Перейти к содержимому
        </a>
        <AuthProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
