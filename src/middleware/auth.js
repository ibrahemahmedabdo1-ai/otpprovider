const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: "غير مصرح - سجل الدخول أولاً" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "الجلسة منتهية، سجل الدخول مرة أخرى" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "لا تملك صلاحية الوصول لهذا القسم" });
    }
    next();
  };
}

// مصادقة عبر API Key للمسارات العامة (POST /v1/otp/send) — منفصلة تمامًا عن جلسة الداشبورد (JWT).
// المفتاح لازم يبدأ بـ otpp_test_ أو otpp_live_ عشان نفرّق بين مفاتيح الاختبار والإنتاج
// (رسائل الاختبار بتستهلك رصيد تجريبي مالوش قيمة مالية، ومفاتيح الإنتاج بتستهلك الرصيد الحقيقي فقط).
async function requireApiKey(req, res, next) {
  const header = req.headers.authorization || "";
  const key = header.startsWith("Bearer ") ? header.slice(7) : req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "مفتاح API مفقود" });

  const { readDb } = require("../utils/db");
  const db = await readDb();
  const record = (db.apiKeys || []).find(k => k.key === key && !k.revoked);
  if (!record) return res.status(401).json({ error: "مفتاح API غير صالح أو تم إلغاؤه" });

  req.apiKey = record;
  req.apiCustomerId = record.customerId;
  req.apiKeyMode = record.mode; // "test" | "production"
  next();
}

module.exports = { signToken, requireAuth, requireRole, requireApiKey, SECRET };
