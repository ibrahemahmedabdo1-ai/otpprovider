"use client";

import { useState } from "react";
import { LandingHeader } from "./header";
import { HeroSection } from "./hero";
import { ServicesSection } from "./services";
import { CodeSection } from "./code-section";
import { PackagesSection } from "./packages";
import { Footer, type FooterSettings } from "./footer";
import { NewsTicker, type NewsItem } from "./news-ticker";

export function LandingPage({
  footerSettings,
  news,
}: {
  footerSettings: FooterSettings;
  news: NewsItem[];
}) {
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  return (
    <div
      className="min-h-screen bg-[#060d1a] text-white overflow-x-hidden"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <LandingHeader locale={locale} onLocaleChange={setLocale} />
      <HeroSection locale={locale} />
      <ServicesSection locale={locale} />
      <CodeSection locale={locale} />
      <PackagesSection locale={locale} />
      <Footer settings={footerSettings} locale={locale} />
      <div className="sticky bottom-0 z-40">
        <NewsTicker items={news} locale={locale} />
      </div>
    </div>
  );
}
