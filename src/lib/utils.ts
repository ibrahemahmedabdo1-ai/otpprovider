import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateOtp(length = 6): string {
  const digits = "0123456789";
  let otp = "";
  const array = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 10);
  }
  for (let i = 0; i < length; i++) {
    otp += digits[array[i] % 10];
  }
  return otp;
}

export function generateRequestId(): string {
  return `otp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = `otp_${Math.random().toString(36).slice(2, 8)}`;
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `${prefix}_${secret}`;
  return { key, prefix, hash: "" }; // hash computed with bcrypt later
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length > 2 ? local[0] + "***" + local.slice(-1) : "***";
  return `${masked}@${domain}`;
}

export function formatDate(date: Date | string, locale = "ar"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
