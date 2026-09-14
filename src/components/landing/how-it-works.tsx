"use client";

import { motion } from "framer-motion";
import { Key, Send, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Key,
    step: "01",
    title: "أنشئ مفتاح API",
    desc: "من لوحة العميل أنشئ مفتاحاً آمناً واستخدمه في طلباتك.",
  },
  {
    icon: Send,
    step: "02",
    title: "أرسل OTP",
    desc: "POST /api/v1/otp/send مع القناة والمستلم — واتساب أو بريد.",
  },
  {
    icon: CheckCircle,
    step: "03",
    title: "تحقق من الرمز",
    desc: "POST /api/v1/otp/verify بالـ requestId والرمز — جاهز.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="py-20 md:py-28 bg-muted/40">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">كيف يعمل النظام؟</h2>
          <p className="text-muted-foreground">ثلاث خطوات فقط للبدء</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          {/* connector line */}
          <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              className="relative text-center space-y-4"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <motion.div
                className="mx-auto relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <s.icon className="h-7 w-7" />
              </motion.div>
              <span className="text-xs font-mono text-primary">{s.step}</span>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
