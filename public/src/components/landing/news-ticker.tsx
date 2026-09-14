"use client";

import { motion } from "framer-motion";

export type NewsItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  link?: string | null;
};

export function NewsTicker({
  items,
  locale = "ar",
}: {
  items: NewsItem[];
  locale?: "ar" | "en";
}) {
  const text = items
    .map((i) => (locale === "ar" ? i.titleAr : i.titleEn))
    .filter(Boolean)
    .join("  •  ");

  if (!text) {
    return (
      <div className="w-full overflow-hidden border-t border-emerald-500/20 bg-[#0a1628]/80 py-2.5">
        <p className="text-center text-xs text-emerald-400/70">
          {locale === "ar"
            ? "مرحباً بكم في OTPProvider Enterprise"
            : "Welcome to OTPProvider Enterprise"}
        </p>
      </div>
    );
  }

  const doubled = `${text}  •  ${text}  •  `;

  return (
    <div className="w-full overflow-hidden border-t border-emerald-500/20 bg-[#0a1628]/90 py-2.5">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: locale === "ar" ? ["0%", "50%"] : ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: Math.max(20, text.length * 0.15),
            ease: "linear",
          },
        }}
      >
        <span className="text-xs sm:text-sm text-emerald-300/90 px-4 font-medium tracking-wide">
          {doubled}
        </span>
        <span className="text-xs sm:text-sm text-emerald-300/90 px-4 font-medium tracking-wide">
          {doubled}
        </span>
      </motion.div>
    </div>
  );
}
