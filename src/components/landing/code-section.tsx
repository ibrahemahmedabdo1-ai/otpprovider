"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function CodeSection({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const isAr = locale === "ar";
  const [tab, setTab] = useState<"node" | "python">("node");

  const nodeCode = `const response = await fetch(
  'https://api.otpprovider.com/v1/otp/send',
  {
    method: 'POST',
    headers: {
      'x-api-key': 'YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: 'whatsapp',
      recipient: '+201xxxxxxxxx'
    })
  }
);`;

  const pythonCode = `import requests

response = requests.post(
  "https://api.otpprovider.com/v1/otp/send",
  headers={
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  json={
    "channel": "whatsapp",
    "recipient": "+201xxxxxxxxx"
  }
)`;

  return (
    <section id="code" className="py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.h2
          className={`text-2xl md:text-3xl font-bold text-white mb-6 ${isAr ? "text-right" : "text-left"}`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {isAr ? "سهولة دمج المطورين" : "Easy Developer Integration"}
        </motion.h2>

        <motion.div
          className="rounded-2xl border border-emerald-500/20 bg-[#0a1628]/80 overflow-hidden shadow-xl shadow-emerald-500/5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-emerald-500/10 px-4 pt-3">
            {(["node", "python"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg transition ${
                  tab === t
                    ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "node" ? "Node.js" : "Python"}
              </button>
            ))}
          </div>

          {/* Code */}
          <pre className="p-4 sm:p-5 overflow-x-auto text-[11px] sm:text-xs leading-relaxed font-mono text-slate-300">
            <code>{tab === "node" ? nodeCode : pythonCode}</code>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
