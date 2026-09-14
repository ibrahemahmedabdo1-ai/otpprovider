"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function HeroSection({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const isAr = locale === "ar";

  const bubbles = [
    {
      type: "whatsapp",
      top: "6%",
      left: "2%",
      title: "WhatsApp",
      sub: isAr ? "تم الإرسال ✓" : "Sent ✓",
      delay: 0,
    },
    {
      type: "email",
      top: "10%",
      right: "0%",
      title: "Email",
      sub: isAr ? "تم التسليم ✓" : "Delivered ✓",
      delay: 0.4,
    },
    {
      type: "otp",
      code: "384921",
      top: "42%",
      left: "-2%",
      delay: 0.2,
    },
    {
      type: "otp",
      code: "157048",
      top: "58%",
      right: "-4%",
      delay: 0.7,
    },
    {
      type: "otp",
      code: "902316",
      top: "78%",
      left: "12%",
      delay: 1.1,
    },
    {
      type: "msg",
      text: isAr ? "تحقق ناجح" : "Verified",
      top: "72%",
      right: "8%",
      delay: 0.9,
    },
  ];

  return (
    <section className="relative overflow-hidden pt-24 pb-12 md:pt-32 md:pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center">
          {/* Text */}
          <div className={`space-y-6 ${isAr ? "text-right lg:order-1" : "text-left"}`}>
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {isAr ? (
                <>
                  منصة اتصالات سحابية
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-500 to-cyan-500">
                    عالمية للأعمال الذكية
                  </span>
                </>
              ) : (
                <>
                  Global Cloud
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">
                    Communications Platform
                  </span>
                </>
              )}
            </motion.h1>

            <motion.p
              className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-lg leading-relaxed"
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
                className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white dark:text-[#060d1a] hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30"
              >
                {isAr ? "ابدأ مجاناً الآن" : "Start Free Now"}
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center rounded-xl border border-slate-300 dark:border-emerald-500/40 px-6 py-3 text-sm font-medium text-slate-700 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-emerald-500/10 transition"
              >
                {isAr ? "تحدث إلى المبيعات" : "Talk to Sales"}
              </Link>
            </motion.div>
          </div>

          {/* Animated sphere + messages */}
          <div className="relative h-[360px] sm:h-[440px] flex items-center justify-center">
            {/* Orbit rings */}
            <motion.div
              className="absolute w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full border border-dashed border-emerald-500/25"
              animate={{ rotate: 360 }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute w-[230px] h-[230px] sm:w-[290px] sm:h-[290px] rounded-full border border-emerald-500/20"
              animate={{ rotate: -360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            />

            {/* Core spinning sphere */}
            <motion.div
              className="relative z-0 w-[180px] h-[180px] sm:w-[230px] sm:h-[230px] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-[#0c1f35] dark:via-[#0a1628] dark:to-[#061018] border border-emerald-500/35 shadow-[0_0_70px_rgba(16,185,129,0.25)]" />
              {[18, 36, 54, 72].map((t) => (
                <div
                  key={t}
                  className="absolute left-[8%] right-[8%] border-t border-emerald-500/20"
                  style={{ top: `${t}%` }}
                />
              ))}
              <div className="absolute inset-[18%] rounded-full border border-emerald-500/15 scale-x-[0.55]" />
              <div className="absolute inset-[28%] rounded-full bg-emerald-500/15 blur-2xl" />
            </motion.div>

            {/* Floating bubbles */}
            {bubbles.map((b, i) => {
              if (b.type === "whatsapp" || b.type === "email") {
                const isWa = b.type === "whatsapp";
                return (
                  <motion.div
                    key={i}
                    className={`absolute z-20 flex items-center gap-2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-[#0a1628]/95 ${
                      isWa
                        ? "border-emerald-500/40 shadow-emerald-500/15"
                        : "border-cyan-500/40 shadow-cyan-500/15"
                    }`}
                    style={{ top: b.top, left: b.left, right: (b as { right?: string }).right }}
                    animate={{ y: [0, isWa ? -12 : 10, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
                  >
                    {isWa ? (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-500" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 7l-10 7L2 7" />
                      </svg>
                    )}
                    <div className="leading-tight">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title}</p>
                      <p className={`text-[10px] ${isWa ? "text-emerald-500" : "text-cyan-500"}`}>{b.sub}</p>
                    </div>
                  </motion.div>
                );
              }

              if (b.type === "otp") {
                return (
                  <motion.div
                    key={i}
                    className="absolute z-10 rounded-lg border border-emerald-500/35 bg-white/90 dark:bg-[#0a1628]/90 px-2.5 py-1.5 font-mono text-xs tracking-[0.2em] text-emerald-600 dark:text-emerald-300 shadow-md"
                    style={{ top: b.top, left: b.left, right: (b as { right?: string }).right }}
                    animate={{ y: [0, -10, 0], opacity: [0.65, 1, 0.65] }}
                    transition={{ duration: 2.4 + i * 0.25, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
                  >
                    {b.code}
                  </motion.div>
                );
              }

              // msg bubble
              return (
                <motion.div
                  key={i}
                  className="absolute z-10 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5"
                  style={{ top: b.top, left: b.left, right: (b as { right?: string }).right }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: b.delay }}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white dark:text-[#060d1a]">
                    ✓
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    {b.text}
                  </span>
                </motion.div>
              );
            })}

            {/* Center verified pulse */}
            <motion.div
              className="absolute z-20 bottom-[4%] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-white/90 dark:bg-emerald-500/15 px-4 py-2 shadow-lg"
              animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white dark:text-[#060d1a]">
                ✓
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-emerald-400"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {isAr ? "التحقق لحظي" : "Instant Verify"}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {isAr ? "واتساب + إيميل" : "WhatsApp + Email"}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
