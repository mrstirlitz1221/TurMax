import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_URL } from "@/lib/format";
import { getI18n, getLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";

const sans = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const display = Playfair_Display({ subsets: ["latin", "cyrillic"], variable: "--font-display-serif", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: L("TurMax — Открой Кыргызстан"), template: "%s · TurMax" },
    description:
      L("Туристический портал Кыргызстана: направления, достопримечательности, маршруты и туры, интерактивная карта и конструктор поездки с расчётом стоимости."),
    openGraph: { type: "website", locale: { ru: "ru_RU", ky: "ky_KG", en: "en_GB" }[await getLocale()], siteName: "TurMax" },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#1d3a2c", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { L, locale } = await getI18n();
  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[2000] focus:bg-white focus:px-4 focus:py-2">
          {L("Перейти к содержимому")}
        </a>
        <I18nProvider locale={locale}>
          <AuthProvider>
            <Header />
            <main id="main" key={locale}>{children}</main>
            <Footer />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
