"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedLogo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function LandingHeader({
  locale = "ar",
  onLocaleChange,
}: {
  locale?: "ar" | "en";
  onLocaleChange?: (l: "ar" | "en") => void;
}) {
  const isAr = locale === "ar";

  return (
    <motion.header
      className="fixed top-0 inset-x-0 z-50 border-b border-emerald-500/10 bg-[#060d1a]/85 backdrop-blur-xl"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
        <AnimatedLogo size="md" />

        <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-300">
          <a href="#features" className="hover:text-emerald-400 transition">
            {isAr ? "الخدمات" : "Services"}
          </a>
          <a href="#code" className="hover:text-emerald-400 transition">
            {isAr ? "للمطورين" : "Developers"}
          </a>
          <a href="#packages" className="hover:text-emerald-400 transition">
            {isAr ? "الباقات" : "Pricing"}
          </a>
          <Link href="/docs/api" className="hover:text-emerald-400 transition">
            API
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition"
          >
            {isAr ? "الدخول" : "Login"}
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-[#060d1a] hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
          >
            {isAr ? "إنشاء حساب" : "Sign Up"}
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
