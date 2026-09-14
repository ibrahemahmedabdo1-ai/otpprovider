"use client";

import Link from "next/link";
import { AnimatedLogo } from "./logo";

export type FooterSettings = {
  companyName?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
};

const defaults: Required<FooterSettings> = {
  companyName: "OTPProvider Enterprise",
  tagline: "منصة OTP احترافية للمؤسسات — WhatsApp & Email",
  email: "support@otpprovider.com",
  phone: "+20 100 000 0000",
  address: "القاهرة، مصر",
  website: "https://otpprovider.com",
};

export function Footer({
  settings,
  locale = "ar",
}: {
  settings?: FooterSettings;
  locale?: "ar" | "en";
}) {
  const s = { ...defaults, ...settings };
  const isAr = locale === "ar";

  return (
    <footer className="border-t border-emerald-500/10 bg-[#060d1a]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <AnimatedLogo size="sm" />
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              {isAr ? s.tagline : "Enterprise OTP platform — WhatsApp & Email"}
            </p>
          </div>

          <div className={isAr ? "text-right" : "text-left"}>
            <h4 className="font-semibold text-white mb-3">
              {isAr ? "تواصل معنا" : "Contact"}
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href={`mailto:${s.email}`} className="hover:text-emerald-400 transition">
                  {s.email}
                </a>
              </li>
              <li>
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-emerald-400 transition">
                  {s.phone}
                </a>
              </li>
              <li>{s.address}</li>
            </ul>
          </div>

          <div className={isAr ? "text-right" : "text-left"}>
            <h4 className="font-semibold text-white mb-3">
              {isAr ? "روابط" : "Links"}
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/docs/api" className="hover:text-emerald-400 transition">
                  API Docs
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition">
                  {isAr ? "تسجيل الدخول" : "Login"}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-emerald-400 transition">
                  {isAr ? "إنشاء حساب" : "Register"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-emerald-500/10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {s.companyName}. {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
}
