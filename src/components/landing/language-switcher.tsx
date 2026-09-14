"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: "ar" | "en";
  onChange?: (l: "ar" | "en") => void;
}) {
  const router = useRouter();
  const toggle = useCallback(() => {
    const next = locale === "ar" ? "en" : "ar";
    if (onChange) {
      onChange(next);
      return;
    }
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    router.refresh();
  }, [locale, onChange, router]);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition"
      aria-label="Switch language"
    >
      <span className="text-base leading-none">{locale === "ar" ? "🇬🇧" : "🇸🇦"}</span>
      <span>{locale === "ar" ? "EN" : "عر"}</span>
    </button>
  );
}





