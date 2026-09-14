"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function HeroSection({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden pt-24 pb-12 md:pt-32 md:pb-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center">
          {/* Text */}
          <div className={`space-y-6 ${isAr ? "text-right lg:order-1" : "text-left"}`}>
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {isAr ? (
                <>
                  منصة اتصالات سحابية
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-cyan-400">
                    عالمية للأعمال الذكية
                  </span>
                </>
              ) : (
                <>
                  Global Cloud
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Communications Platform
                  </span>
                </>
              )}
            </motion.h1>

            <motion.p
              className="text-slate-400 text-base sm:text-lg max-w-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              {isAr
                ? "منصة اتصالات سحابية عالمية لإرسال والتحقق من OTP عبر واتساب والبريد الإلكتروني بمعايير أمان المؤسسات."
                : "Enterprise-grade cloud platform for sending and verifying OTPs via WhatsApp and Email with global delivery."}
            </motion.p>

            <motion.div
              className={`flex flex-wrap gap-3 ${isAr ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Link
                href="/register"
                className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#060d1a] hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30"
              >
                {isAr ? "ابدأ مجاناً الآن" : "Start Free Now"}
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center rounded-xl border border-emerald-500/40 px-6 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
              >
                {isAr ? "تحدث إلى المبيعات" : "Talk to Sales"}
              </Link>
            </motion.div>
          </div>

          {/* Globe visual */}
          <div className="relative h-[320px] sm:h-[400px] flex items-center justify-center">
            <motion.div
              className="relative w-[260px] h-[260px] sm:w-[340px] sm:h-[340px]"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              {/* Globe circle */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 bg-gradient-to-br from-[#0a1a2e] to-[#061018] shadow-[0_0_80px_rgba(16,185,129,0.15)]" />
              <div className="absolute inset-4 rounded-full border border-emerald-500/10" />
              <div className="absolute inset-8 rounded-full border border-dashed border-emerald-500/15" />

              {/* Grid lines simulation */}
              <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-emerald-500/20"
                    style={{ top: `${15 + i * 14}%` }}
                  />
                ))}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={`v${i}`}
                    className="absolute top-0 bottom-0 border-l border-emerald-500/20"
                    style={{ left: `${15 + i * 14}%` }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Pins */}
            {[
              { top: "18%", left: "55%", label: isAr ? "هونج كونج" : "Hong Kong", delay: 0 },
              { top: "55%", left: "22%", label: isAr ? "جاكرتا" : "Jakarta", delay: 0.5 },
              { top: "60%", left: "70%", label: isAr ? "إندونيسيا" : "Indonesia", delay: 1 },
            ].map((pin, i) => (
              <motion.div
                key={i}
                className="absolute z-10"
                style={{ top: pin.top, left: pin.left }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 + pin.delay, type: "spring" }}
              >
                <motion.div
                  className="relative"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: pin.delay }}
                >
                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0a1628]/95 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-300">
                    {pin.label}
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border border-emerald-400"
                    animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: pin.delay }}
                  />
                </motion.div>
              </motion.div>
            ))}

            {/* Connection lines glow */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 400 400">
              <motion.path
                d="M220 80 Q 200 200 100 230"
                fill="none"
                stroke="url(#g)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1 }}
              />
              <motion.path
                d="M220 80 Q 280 200 280 250"
                fill="none"
                stroke="url(#g)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.3 }}
              />
              <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
