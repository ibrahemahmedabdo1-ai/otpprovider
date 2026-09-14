"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function AnimatedLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <motion.div
        className="relative flex h-9 w-9 items-center justify-center"
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-80 blur-[2px]" />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0a1628] border border-emerald-400/50">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <motion.div
          className="absolute -inset-1 rounded-full border border-emerald-400/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </motion.div>
      <div className="flex flex-col leading-tight">
        <span className={`font-bold tracking-tight text-white ${textSize}`}>
          OTP<span className="text-emerald-400">Provider</span>
        </span>
        <span className="text-[10px] text-emerald-500/70 font-medium tracking-wider uppercase">
          Enterprise
        </span>
      </div>
    </Link>
  );
}
