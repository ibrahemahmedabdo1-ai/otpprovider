const express = require("express");
const { readDb } = require("../utils/db");
const { lookupIp, getClientIp } = require("../utils/geo");

const router = express.Router();

// يستخدمه الفرونت إند لتحديد الدولة/اللغة/العملة تلقائيًا من الـ IP
router.get("/geo", async (req, res) => {
  const geo = await lookupIp(getClientIp(req));
  res.json(geo);
});

// الباكدجات المعروضة للعامة (صفحة الهبوط)
router.get("/packages", async (req, res) => {
  const db = (await readDb());
  res.json(db.packages);
});

// نصوص لغة واحدة (يستخدمها i18n.js في الفرونت إند)
router.get("/languages/:lang", async (req, res) => {
  const db = (await readDb());
  const dict = db.languages[req.params.lang];
  if (!dict) return res.status(404).json({ error: "اللغة غير مدعومة" });
  res.json(dict);
});

// التسعير العام (صفحة /pricing.html)
router.get("/pricing", async (req, res) => {
  const db = (await readDb());
  res.json(db.pricingTiers);
});

module.exports = router;
