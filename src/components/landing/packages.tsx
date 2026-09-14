"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function PackagesSection({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const isAr = locale === "ar";

  const plans = [
    {
      name: isAr ? "الأساسية" : "Basic",
      price: "$0.008",
      unit: isAr ? "لكل طلب" : "per request",
      features: isAr
        ? ["دعم القناة", "حدود معدل بسيطة", "دعم البريد الأساسي", "وصول للوحة التحكم"]
        : ["Channel support", "Basic rate limits", "Email support", "Dashboard access"],
      popular: false,
      cta: isAr ? "اختر الباقة" : "Choose Plan",
    },
    {
      name: isAr ? "المحترفة" : "Pro",
      price: "$0.005",
      unit: isAr ? "لكل طلب" : "per request",
      features: isAr
        ? ["دعم القناة", "حدود معدل متقدمة", "دعم أولوية", "تقارير مفصلة", "API كامل"]
        : ["All channels", "Advanced limits", "Priority support", "Detailed reports", "Full API"],
      popular: true,
      cta: isAr ? "الخطة المختارة" : "Selected Plan",
    },
    {
      name: isAr ? "المؤسسات" : "Enterprise",
      price: "$5,500",
      unit: isAr ? "شهرياً" : "per month",
      features: isAr
        ? ["حجم غير محدود", "SLA مضمون", "مدير حساب", "تكامل مخصص", "دعم 24/7"]
        : ["Unlimited volume", "Guaranteed SLA", "Account manager", "Custom integration", "24/7 support"],
      popular: false,
      cta: isAr ? "تواصل معنا" : "Contact Us",
    },
  ];

  return (
    <section id="packages" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-white text-center mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {isAr ? "خطط الاشتراك" : "Subscription Plans"}
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                p.popular
                  ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.15)]"
                  : "border-slate-700/50 bg-[#0a1628]/60"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold text-[#060d1a]">
                  {isAr ? "الأكثر طلباً" : "Popular"}
                </span>
              )}

              <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">{p.price}</span>
                <span className="text-xs text-slate-400 ms-1">{p.unit}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition ${
                  p.popular
                    ? "bg-emerald-500 text-[#060d1a] hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                    : "border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
