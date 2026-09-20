const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb, defaultTestAllowance } = require("../utils/db");
const { signToken } = require("../middleware/auth");
const { lookupIp, getClientIp } = require("../utils/geo");
const { sendVerificationEmail } = require("../utils/email");

const router = express.Router();
const VERIFY_TTL_MS = 30 * 60 * 1000;

function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
function publicUser(u) {
  const { passwordHash, emailVerificationTokenHash, ...rest } = u;
  return rest;
}
function issueVerificationToken(user) {
  const raw = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  user.emailVerificationExpiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
  return raw;
}

router.post("/register", async (req, res) => {
  const { name, password } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: "الاسم والإيميل وكلمة المرور (8 أحرف على الأقل) مطلوبة" });
  }
  const db = await readDb();
  if (db.users.find(u => normalizeEmail(u.email) === email)) {
    return res.status(409).json({ error: "الإيميل مستخدم بالفعل" });
  }
  const geo = await lookupIp(getClientIp(req));
  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: uuidv4(), name, email, passwordHash, role: "client",
    emailVerified: false, emailVerificationTokenHash: null, emailVerificationExpiresAt: null,
    country: geo.country, language: geo.language, currency: geo.currency,
    balance: 0, testAllowance: defaultTestAllowance(), createdAt: new Date().toISOString()
  };
  const token = issueVerificationToken(user);
  db.users.push(user);
  await writeDb(db);
  let emailSent = false;
  try { emailSent = (await sendVerificationEmail(user.email, user.name, token)).ok; } catch (err) { console.error("verification email error", err.message); }
  res.status(201).json({ success: true, requiresEmailVerification: true, emailSent, message: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني قبل تسجيل الدخول." });
});

router.post("/verify-email", async (req, res) => {
  const token = String(req.body.token || "");
  if (!token) return res.status(400).json({ error: "Verification token is required" });
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const db = await readDb();
  const user = db.users.find(u => u.emailVerificationTokenHash === hash);
  if (!user || !user.emailVerificationExpiresAt || Date.parse(user.emailVerificationExpiresAt) < Date.now()) {
    return res.status(400).json({ error: "الرابط غير صالح أو انتهت صلاحيته" });
  }
  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await writeDb(db);
  res.json({ success: true, message: "تم تأكيد البريد الإلكتروني" });
});

router.post("/resend-verification", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const db = await readDb();
  const user = db.users.find(u => normalizeEmail(u.email) === email);
  if (!user || user.emailVerified) return res.json({ success: true, message: "إذا كان الحساب يحتاج تحققًا فسيتم إرسال رسالة" });
  const token = issueVerificationToken(user);
  await writeDb(db);
  try { await sendVerificationEmail(user.email, user.name, token); } catch (err) { console.error("resend verification error", err.message); }
  res.json({ success: true, message: "تمت محاولة إرسال رسالة التحقق" });
});

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  const db = await readDb();
  const user = db.users.find(u => normalizeEmail(u.email) === email);
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }
  if (user.role === "client" && user.emailVerified !== true) {
    return res.status(403).json({ error: "يرجى تأكيد بريدك الإلكتروني أولًا", code: "EMAIL_NOT_VERIFIED" });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

module.exports = router;
