const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb, defaultTestAllowance } = require("../utils/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const whatsapp = require("../utils/whatsapp");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

// ---- إدارة المستخدمين (عملاء / سبورت) ----
router.get("/users", async (req, res) => {
  const db = (await readDb());
  res.json(db.users.map(publicUser));
});

// إنشاء مستخدم جديد (عميل / سبورت / أدمن) - الأدمن فقط يقدر يعمل ده
router.post("/users", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!["client", "support", "admin"].includes(role)) {
    return res.status(400).json({ error: "الدور يجب أن يكون client أو support أو admin" });
  }
  const db = (await readDb());
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "الإيميل مستخدم بالفعل" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(), name, email, passwordHash, role,
    country: "N/A", language: "ar", currency: "USD", balance: 0,
    testAllowance: role === "client" ? defaultTestAllowance() : undefined,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  await writeDb(db);
  res.json(publicUser(user));
});

// حذف مستخدم (عميل / سبورت / أدمن)
router.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "لا يمكنك حذف حسابك الحالي" });
  }
  const db = (await readDb());
  const exists = db.users.find(u => u.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "المستخدم غير موجود" });
  db.users = db.users.filter(u => u.id !== req.params.id);
  await writeDb(db);
  res.json({ ok: true });
});

// ضبط رسائل الاختبار المجانية للعميل لكل قناة (زيادة / نقصان / قفل)
router.post("/clients/:id/test-allowance", async (req, res) => {
  const { channel, remaining, locked } = req.body;
  const db = (await readDb());
  const user = db.users.find(u => u.id === req.params.id && u.role === "client");
  if (!user) return res.status(404).json({ error: "العميل غير موجود" });
  if (!user.testAllowance) user.testAllowance = defaultTestAllowance();
  if (!user.testAllowance[channel]) return res.status(400).json({ error: "قناة غير معروفة" });
  if (typeof remaining === "number") user.testAllowance[channel].remaining = Math.max(0, remaining);
  if (typeof locked === "boolean") user.testAllowance[channel].locked = locked;
  await writeDb(db);
  res.json(user.testAllowance);
});

// ---- خدمات العميل: تفعيل/تعطيل - مجاني/مدفوع ----
router.get("/clients/:id/services", async (req, res) => {
  const db = (await readDb());
  res.json(db.services.filter(s => s.clientId === req.params.id));
});

router.post("/clients/:id/services", async (req, res) => {
  const { name, channel, billing } = req.body; // billing: free | paid
  const db = (await readDb());
  const service = { id: uuidv4(), clientId: req.params.id, name, channel, billing: billing || "paid", status: "active", createdAt: new Date().toISOString() };
  db.services.push(service);
  await writeDb(db);
  res.json(service);
});

router.post("/services/:id/toggle", async (req, res) => {
  const db = (await readDb());
  const service = db.services.find(s => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: "الخدمة غير موجودة" });
  service.status = service.status === "active" ? "inactive" : "active";
  await writeDb(db);
  res.json(service);
});

router.post("/services/:id/billing", async (req, res) => {
  const { billing } = req.body; // free | paid
  const db = (await readDb());
  const service = db.services.find(s => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: "الخدمة غير موجودة" });
  service.billing = billing;
  await writeDb(db);
  res.json(service);
});

// ---- الباكدجات (CRUD) ----
router.get("/packages", async (req, res) => {
  const db = (await readDb());
  res.json(db.packages);
});

router.post("/packages", async (req, res) => {
  const db = (await readDb());
  try { validatePackageInput(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const pkg = { id: uuidv4(), active: true, visible: true, popular: false, order: db.packages.length + 1, features: [], channels: { whatsapp: true, email: true }, ...req.body };
  db.packages.push(pkg);
  require("../utils/billing").logAudit(db, { adminId: req.user.id, action: "package_create", after: pkg, ip: req.socket?.remoteAddress || null });
  await writeDb(db);
  res.json(pkg);
});

router.put("/packages/:id", async (req, res) => {
  const db = (await readDb());
  const pkg = db.packages.find(p => p.id === req.params.id);
  if (!pkg) return res.status(404).json({ error: "الباكدج غير موجود" });
  try { validatePackageInput(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const before = { ...pkg };
  Object.assign(pkg, req.body);
  require("../utils/billing").logAudit(db, { adminId: req.user.id, action: "package_update", before, after: pkg, ip: req.socket?.remoteAddress || null });
  await writeDb(db);
  res.json(pkg);
});

router.delete("/packages/:id", async (req, res) => {
  const db = (await readDb());
  const pkg = db.packages.find(p => p.id === req.params.id);
  if (!pkg) return res.status(404).json({ error: "الباكدج غير موجود" });
  db.packages = db.packages.filter(p => p.id !== req.params.id);
  require("../utils/billing").logAudit(db, { adminId: req.user.id, action: "package_delete", before: pkg, ip: req.socket?.remoteAddress || null });
  await writeDb(db);
  res.json({ ok: true });
});

// ---- قوالب OTP: اعتماد أو رفض تعديل السبورت ----
router.get("/templates", async (req, res) => {
  const db = (await readDb());
  res.json(db.otpTemplates);
});

router.post("/templates/:id/approve", async (req, res) => {
  const db = (await readDb());
  const tpl = db.otpTemplates.find(t => t.id === req.params.id);
  if (!tpl) return res.status(404).json({ error: "غير موجود" });
  if (tpl.pendingBody) tpl.body = tpl.pendingBody;
  tpl.pendingBody = null;
  tpl.status = "approved";
  await writeDb(db);
  res.json(tpl);
});

router.post("/templates/:id/reject", async (req, res) => {
  const db = (await readDb());
  const tpl = db.otpTemplates.find(t => t.id === req.params.id);
  if (!tpl) return res.status(404).json({ error: "غير موجود" });
  tpl.pendingBody = null;
  tpl.status = "approved";
  await writeDb(db);
  res.json(tpl);
});

// ---- ربط واتساب الحقيقي عبر QR ----
router.post("/whatsapp/connect", async (req, res) => {
  try {
    const deviceId = req.body?.deviceId || "default";
    const result = await whatsapp.generateConnectQr(deviceId);
    res.status(202).json({ success: true, ...result });
  } catch (error) {
    const status = error.code === "WHATSAPP_DEPENDENCY_MISSING" ? 503 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.get("/whatsapp/qr/:deviceId", (req, res) => {
  const deviceId = req.params.deviceId;
  res.json({
    deviceId,
    status: whatsapp.getDeviceStatus(deviceId),
    qr: whatsapp.getDeviceQR(deviceId)
  });
});

router.post("/whatsapp/confirm", async (req, res) => {
  await whatsapp.confirmConnected();
  res.json({ connected: true });
});

router.post("/whatsapp/disconnect", async (req, res) => {
  await whatsapp.disconnect(req.body?.deviceId || "default");
  res.json({ connected: false });
});

router.get("/settings", async (req, res) => {
  const db = (await readDb());
  res.json(db.settings);
});

router.post("/settings", async (req, res) => {
  const db = (await readDb());
  Object.assign(db.settings, req.body);
  await writeDb(db);
  res.json(db.settings);
});

// ---- تذاكر (رؤية شاملة) ----
router.get("/tickets", async (req, res) => {
  const db = (await readDb());
  res.json(db.tickets);
});

// ---- شات السبورت <-> الأدمن ----
router.get("/admin-chat/:supportId", async (req, res) => {
  const db = (await readDb());
  res.json(db.adminChats.filter(m => m.supportId === req.params.supportId));
});

router.post("/admin-chat/:supportId", async (req, res) => {
  const db = (await readDb());
  const msg = { id: uuidv4(), supportId: req.params.supportId, senderRole: "admin", message: req.body.message || "", fileUrl: null, createdAt: new Date().toISOString() };
  db.adminChats.push(msg);
  await writeDb(db);
  res.json(msg);
});

// ---- إدارة لغات الموقع (٣ لغات) - مخزّنة في قاعدة البيانات مباشرة (تعمل على Vercel) ----
router.get("/languages", async (req, res) => {
  const db = (await readDb());
  res.json(db.languages);
});

router.put("/languages/:lang", async (req, res) => {
  const db = (await readDb());
  if (!db.languages[req.params.lang]) return res.status(404).json({ error: "اللغة غير موجودة" });
  db.languages[req.params.lang] = req.body;
  await writeDb(db);
  res.json({ ok: true });
});

// ---- التسعير: سعر الرسالة الواحدة / 10 / 100 ... لكل قناة على حدة + عروض مجمعة ----
router.get("/pricing", async (req, res) => {
  const db = (await readDb());
  res.json(db.pricingTiers);
});

router.post("/pricing/:channel", async (req, res) => {
  const { qty, price } = req.body;
  const db = (await readDb());
  if (!db.pricingTiers[req.params.channel]) db.pricingTiers[req.params.channel] = [];
  db.pricingTiers[req.params.channel].push({ qty: Number(qty), price: Number(price) });
  db.pricingTiers[req.params.channel].sort((a, b) => a.qty - b.qty);
  await writeDb(db);
  res.json(db.pricingTiers[req.params.channel]);
});

router.delete("/pricing/:channel/:index", async (req, res) => {
  const db = (await readDb());
  const list = db.pricingTiers[req.params.channel];
  if (!list) return res.status(404).json({ error: "القناة غير موجودة" });
  list.splice(Number(req.params.index), 1);
  await writeDb(db);
  res.json(list);
});

// ---- اكتشاف الأخطاء على مستوى النظام كله (وليس عميل واحد فقط) ----
router.get("/detect-errors", async (req, res) => {
  const db = (await readDb());
  const issues = [];

  const clientsWithoutBalance = db.users.filter(u => u.role === "client" && u.balance <= 0).length;
  if (clientsWithoutBalance > 0) {
    issues.push({ code: "CLIENTS_NO_BALANCE", title: `${clientsWithoutBalance} عميل بدون رصيد كافٍ`, severity: "medium" });
  }

  const inactiveServices = db.services.filter(s => s.status === "inactive").length;
  if (inactiveServices > 0) {
    issues.push({ code: "INACTIVE_SERVICES", title: `${inactiveServices} خدمة معطّلة حاليًا لدى العملاء`, severity: "medium" });
  }

  if (!db.settings.whatsappConnected) {
    issues.push({ code: "WHATSAPP_DISCONNECTED", title: "رقم واتساب غير مربوط بالمنصة حاليًا", severity: "high", fix: "reconnect-whatsapp" });
  }

  const pendingTemplates = db.otpTemplates.filter(t => t.status === "pending").length;
  if (pendingTemplates > 0) {
    issues.push({ code: "PENDING_TEMPLATES", title: `${pendingTemplates} قالب رسالة بانتظار موافقتك`, severity: "medium", fix: "approve-all-templates" });
  }

  const openTicketsNoSupport = db.tickets.filter(t => t.status === "open" && !t.supportId).length;
  if (openTicketsNoSupport > 0) {
    issues.push({ code: "UNASSIGNED_TICKETS", title: `${openTicketsNoSupport} تذكرة مفتوحة لم يتم تعيين سبورت لها`, severity: "medium" });
  }

  if (issues.length === 0) {
    issues.push({ code: "OK", title: "لا توجد مشاكل ظاهرة في النظام حاليًا", severity: "info" });
  }
  res.json({ issues });
});

// إصلاحات سريعة بضغطة زر
router.post("/fix/:action", async (req, res) => {
  const db = (await readDb());
  if (req.params.action === "approve-all-templates") {
    db.otpTemplates.forEach(t => {
      if (t.status === "pending" && t.pendingBody) t.body = t.pendingBody;
      t.pendingBody = null;
      t.status = "approved";
    });
    await writeDb(db);
    return res.json({ ok: true, message: "تم اعتماد كل القوالب المعلّقة" });
  }
  if (req.params.action === "reconnect-whatsapp") {
    const result = await whatsapp.generateConnectQr();
    return res.json({ ok: true, message: "تم توليد QR جديد لإعادة ربط واتساب", ...result });
  }
  res.status(400).json({ error: "إجراء إصلاح غير معروف" });
});

// ==================== نظام الفوترة والباكدجات والكوبونات (billing engine) ====================
const billing = require("../utils/billing");
const { validatePackageInput, validatePricingRuleInput } = billing;

function auditIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
}

// ---- Pricing Rules: تكلفة استهلاك الـ OTP نفسه (منفصلة عن سعر الباكدج) ----
router.get("/pricing-rules", async (req, res) => {
  const db = (await readDb());
  res.json(db.pricingRules);
});

router.post("/pricing-rules", async (req, res) => {
  const db = (await readDb());
  try { validatePricingRuleInput(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const rule = { id: uuidv4(), active: true, providerCost: 0, customerCost: 0, creditCost: 1, currency: "USD", retryCost: 0, fallbackCost: 0, minBalance: 0, country: null, countryCode: null, effectiveFrom: null, effectiveUntil: null, ...req.body };
  db.pricingRules.push(rule);
  billing.logAudit(db, { adminId: req.user.id, action: "pricing_rule_create", after: rule, ip: auditIp(req) });
  await writeDb(db);
  res.json(rule);
});

router.put("/pricing-rules/:id", async (req, res) => {
  const db = (await readDb());
  const rule = db.pricingRules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json({ error: "القاعدة غير موجودة" });
  try { validatePricingRuleInput(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const before = { ...rule };
  Object.assign(rule, req.body);
  billing.logAudit(db, { adminId: req.user.id, action: "pricing_rule_update", before, after: rule, ip: auditIp(req) });
  await writeDb(db);
  res.json(rule);
});

router.delete("/pricing-rules/:id", async (req, res) => {
  const db = (await readDb());
  const rule = db.pricingRules.find(r => r.id === req.params.id);
  db.pricingRules = db.pricingRules.filter(r => r.id !== req.params.id);
  billing.logAudit(db, { adminId: req.user.id, action: "pricing_rule_delete", before: rule, ip: auditIp(req) });
  await writeDb(db);
  res.json({ ok: true });
});

// ---- Coupons ----
router.get("/coupons", async (req, res) => {
  const db = (await readDb());
  res.json(db.coupons);
});

router.post("/coupons", async (req, res) => {
  const { code } = req.body;
  const db = (await readDb());
  if (!code) return res.status(400).json({ error: "كود الكوبون مطلوب" });
  if (db.coupons.find(c => c.code.toLowerCase() === code.toLowerCase())) {
    return res.status(409).json({ error: "الكود مستخدم بالفعل" });
  }
  const coupon = {
    id: uuidv4(), code, type: "percentage", value: 0, bonusCredits: 0,
    maxUses: null, perCustomerLimit: null, minimumPurchase: 0,
    startDate: null, expirationDate: null, active: true, usedCount: 0,
    ...req.body
  };
  db.coupons.push(coupon);
  billing.logAudit(db, { adminId: req.user.id, action: "coupon_create", after: coupon, ip: auditIp(req) });
  await writeDb(db);
  res.json(coupon);
});

router.put("/coupons/:id", async (req, res) => {
  const db = (await readDb());
  const coupon = db.coupons.find(c => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: "الكوبون غير موجود" });
  const before = { ...coupon };
  Object.assign(coupon, req.body);
  billing.logAudit(db, { adminId: req.user.id, action: "coupon_update", before, after: coupon, ip: auditIp(req) });
  await writeDb(db);
  res.json(coupon);
});

router.delete("/coupons/:id", async (req, res) => {
  const db = (await readDb());
  const coupon = db.coupons.find(c => c.id === req.params.id);
  db.coupons = db.coupons.filter(c => c.id !== req.params.id);
  billing.logAudit(db, { adminId: req.user.id, action: "coupon_delete", before: coupon, ip: auditIp(req) });
  await writeDb(db);
  res.json({ ok: true });
});

// ---- Payment methods: الأدمن بيدخل بيانات محفظته بنفسه (رابط Binance/USDT/BTC) ----
router.get("/payment-methods", async (req, res) => {
  const db = (await readDb());
  res.json(db.paymentMethods);
});

router.put("/payment-methods/:id", async (req, res) => {
  const db = (await readDb());
  const pm = db.paymentMethods.find(p => p.id === req.params.id);
  if (!pm) return res.status(404).json({ error: "طريقة الدفع غير موجودة" });
  const before = { ...pm };
  Object.assign(pm, req.body);
  billing.logAudit(db, { adminId: req.user.id, action: "payment_method_update", before, after: pm, ip: auditIp(req) });
  await writeDb(db);
  res.json(pm);
});

// ---- Orders: مراجعة واعتماد/رفض الدفعات اليدوية (Binance/USDT/BTC/تحويل يدوي) ----
// قاعدة صارمة: ممنوع نضيف رصيد لعميل إلا بعد اعتماد الأدمن هنا — لا يوجد إضافة تلقائية لأي دفعة غير مؤكدة.
router.get("/orders", async (req, res) => {
  const db = (await readDb());
  const { status } = req.query;
  let orders = db.orders;
  if (status) orders = orders.filter(o => o.status === status);
  res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post("/orders/:id/approve", async (req, res) => {
  const db = (await readDb());
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  if (order.status === "paid") return res.status(400).json({ error: "الطلب معتمد بالفعل" });
  if (order.status !== "pending_review") return res.status(400).json({ error: "لا يمكن اعتماد الطلب قبل مراجعته" });
  if (order.status === "cancelled") return res.status(400).json({ error: "الطلب ملغي" });

  const before = { ...order };
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  order.approvedBy = req.user.id;

  const ledgerEntry = billing.addLedgerEntry(db, {
    customerId: order.customerId, type: "purchase", amount: order.creditsGranted,
    relatedOrderId: order.id, note: `اعتماد دفعة الباكدج ${order.packageName}`, createdBy: req.user.id
  });

  let bonusEntry = null;
  if (order.bonusCredits > 0) {
    bonusEntry = billing.addLedgerEntry(db, {
      customerId: order.customerId, type: "bonus", amount: order.bonusCredits,
      relatedOrderId: order.id, note: `بونص كوبون ${order.couponCode || ""}`, createdBy: req.user.id
    });
  }

  if (order.couponCode) {
    const coupon = db.coupons.find(c => c.code === order.couponCode);
    if (coupon) coupon.usedCount = (coupon.usedCount || 0) + 1;
  }

  billing.logAudit(db, { adminId: req.user.id, action: "order_approve", before, after: order, ip: auditIp(req) });
  await writeDb(db);
  res.json({ order, ledgerEntry, bonusEntry });
});

router.post("/orders/:id/reject", async (req, res) => {
  const db = (await readDb());
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  const before = { ...order };
  order.status = "rejected";
  order.rejectedBy = req.user.id;
  order.rejectReason = req.body.reason || "";
  billing.logAudit(db, { adminId: req.user.id, action: "order_reject", before, after: order, ip: auditIp(req) });
  await writeDb(db);
  res.json(order);
});

// تعديل رصيد يدوي (استثناء نادر) — لازم يعدي من الليدجر وميّتسجلش بدون سبب موثّق
router.post("/customers/:id/adjust-balance", async (req, res) => {
  const { amount, note } = req.body;
  if (typeof amount !== "number" || amount === 0) return res.status(400).json({ error: "قيمة التعديل مطلوبة" });
  if (!note) return res.status(400).json({ error: "لازم تكتب سبب التعديل" });
  const db = (await readDb());
  const type = amount > 0 ? "adjustment" : "consume";
  const entry = billing.addLedgerEntry(db, { customerId: req.params.id, type, amount, note, createdBy: req.user.id });
  billing.logAudit(db, { adminId: req.user.id, action: "manual_balance_adjustment", after: entry, ip: auditIp(req) });
  await writeDb(db);
  res.json(entry);
});

// ---- Ledger & Audit log (عرض) ----
router.get("/ledger", async (req, res) => {
  const db = (await readDb());
  const { customerId } = req.query;
  let entries = db.ledger;
  if (customerId) entries = entries.filter(l => l.customerId === customerId);
  res.json(entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 500));
});

router.get("/audit-log", async (req, res) => {
  const db = (await readDb());
  res.json(db.auditLog.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 500));
});

// ---- تحليلات الربح ----
router.get("/profit-analytics", async (req, res) => {
  const db = (await readDb());
  res.json(billing.profitOverview(db));
});

// ---- API Keys (عرض شامل للأدمن) ----
router.get("/api-keys", async (req, res) => {
  const db = (await readDb());
  res.json(db.apiKeys.map(k => ({ ...k, key: k.key.slice(0, 12) + "••••••" })));
});

module.exports = router;
