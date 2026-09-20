const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb } = require("../utils/db");
const billing = require("../utils/billing");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendOtp } = require("../utils/sms");

const router = express.Router();
router.use(requireAuth, requireRole("client"));

const upload = multer({ dest: path.join(__dirname, "..", "..", "public", "uploads") });

// بيانات لوحة العميل
router.get("/me", async (req, res) => {
  const db = (await readDb());
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// الباكدجات + شراء باكدج (شحن رصيد عبر نظام طلبات حقيقي)
router.get("/packages", async (req, res) => {
  const db = (await readDb());
  res.json(db.packages.filter(p => p.active));
});

// إنشاء طلب شراء باكدج — لسه مفيش رصيد بيتضاف هنا، ده بس إنشاء الطلب بسعره النهائي بعد الكوبون
router.post("/orders", async (req, res) => {
  const { packageId, paymentMethodId, couponCode } = req.body;
  const db = (await readDb());
  const pkg = db.packages.find(p => p.id === packageId && p.active);
  if (!pkg) return res.status(404).json({ error: "الباكدج غير موجود أو غير متاح" });

  const pm = db.paymentMethods.find(p => p.id === paymentMethodId && p.enabled);
  if (!pm) return res.status(400).json({ error: "طريقة الدفع غير متاحة حاليًا" });

  let finalPrice = pkg.price;
  let discount = 0;
  let bonusCredits = 0;
  let coupon = null;

  if (couponCode) {
    coupon = db.coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());
    const result = billing.applyCoupon(db, coupon, pkg.price, req.user.id);
    if (result.error) return res.status(400).json({ error: result.error });
    finalPrice = result.finalPrice;
    discount = result.discount;
    bonusCredits = result.bonusCredits;
  }

  const order = {
    id: uuidv4(),
    customerId: req.user.id,
    packageId: pkg.id,
    packageName: pkg.name,
    creditsGranted: pkg.credits,
    price: pkg.price,
    discount,
    finalPrice,
    couponCode: coupon ? coupon.code : null,
    bonusCredits,
    paymentMethodId: pm.id,
    paymentMethodLabel: pm.label,
    status: "pending_payment", // pending_payment -> pending_review -> paid | rejected | cancelled
    payment: null,
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  await writeDb(db);
  res.json({
    order,
    paymentInstructions: {
      walletAddress: pm.walletAddress,
      network: pm.network,
      instructions: pm.instructions,
      minPayment: pm.minPayment
    }
  });
});

// إرسال إثبات دفع يدوي (Binance/USDT/BTC/تحويل بنكي) — لا يتم شحن الرصيد تلقائيًا، الأدمن لازم يعتمد الطلب أولاً
router.post("/orders/:id/submit-payment", async (req, res) => {
  const { txHash, amount, network, screenshotUrl } = req.body;
  const db = (await readDb());
  const order = db.orders.find(o => o.id === req.params.id && o.customerId === req.user.id);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  if (order.status !== "pending_payment") return res.status(400).json({ error: "الطلب مش في حالة انتظار الدفع" });

  order.payment = { txHash: txHash || null, amount: amount || null, network: network || null, screenshotUrl: screenshotUrl || null, submittedAt: new Date().toISOString() };
  order.status = "pending_review";
  await writeDb(db);
  res.json(order);
});

router.get("/orders", async (req, res) => {
  const db = (await readDb());
  res.json(db.orders.filter(o => o.customerId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// سجل حركة الرصيد الخاص بالعميل (كل عملية شراء/استهلاك/بونص/استرداد)
router.get("/ledger", async (req, res) => {
  const db = (await readDb());
  res.json(db.ledger.filter(l => l.customerId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 300));
});

// حاسبة الرصيد الحية — بتحسب من PricingRule الحالي وليس رقم ثابت في الكود
router.post("/calculate", async (req, res) => {
  const { channel, country, qty } = req.body;
  const db = (await readDb());
  const n = Number(qty) || 0;
  const rule = db.pricingRules.find(r => r.channel === channel && r.active && (!country || r.country === country))
    || db.pricingRules.find(r => r.channel === channel && r.active && !r.country);
  if (!rule) return res.status(404).json({ error: "لا توجد قاعدة تسعير لهذه القناة حاليًا" });

  const requiredCredits = n * rule.creditCost;
  const estimatedCost = n * rule.customerCost;
  const user = db.users.find(u => u.id === req.user.id);
  res.json({
    channel, qty: n, creditCostPerUnit: rule.creditCost, requiredCredits,
    estimatedCost, currency: rule.currency, remainingBalance: user.balance,
    enoughBalance: user.balance >= requiredCredits
  });
});

// ---- مفاتيح API (test/production) ----
router.get("/api-keys", async (req, res) => {
  const db = (await readDb());
  const keys = db.apiKeys.filter(k => k.customerId === req.user.id);
  res.json(keys.map(k => ({ ...k, key: k.revoked ? k.key : maskKey(k.key) })));
});

router.post("/api-keys", async (req, res) => {
  const { mode } = req.body; // "test" | "production"
  if (!["test", "production"].includes(mode)) return res.status(400).json({ error: "نوع المفتاح يجب أن يكون test أو production" });
  const db = (await readDb());
  const prefix = mode === "test" ? "otpp_test_" : "otpp_live_";
  const key = prefix + uuidv4().replace(/-/g, "");
  const record = { id: uuidv4(), customerId: req.user.id, mode, key, revoked: false, createdAt: new Date().toISOString() };
  db.apiKeys.push(record);
  await writeDb(db);
  res.json(record); // المفتاح الكامل بيظهر مرة واحدة بس وقت الإنشاء
});

router.delete("/api-keys/:id", async (req, res) => {
  const db = (await readDb());
  const key = db.apiKeys.find(k => k.id === req.params.id && k.customerId === req.user.id);
  if (!key) return res.status(404).json({ error: "المفتاح غير موجود" });
  key.revoked = true;
  await writeDb(db);
  res.json({ ok: true });
});

function maskKey(key) {
  return key.slice(0, 12) + "••••••" + key.slice(-4);
}

// خدمات العميل (تفعيل/تعطيل يتم من الأدمن فقط - هنا عرض فقط)
router.get("/services", async (req, res) => {
  const db = (await readDb());
  res.json(db.services.filter(s => s.clientId === req.user.id));
});

// عرض عدد رسائل الاختبار المتبقية لكل قناة (يتحكم فيها الأدمن)
router.get("/test-allowance", async (req, res) => {
  const db = (await readDb());
  const user = db.users.find(u => u.id === req.user.id);
  res.json(user.testAllowance || {});
});

// زر الاختبار: يرسل OTP تجريبي عبر القناة المطلوبة (يستهلك من رصيد رسائل الاختبار المجانية، وليس الرصيد المدفوع)
router.post("/test", async (req, res) => {
  const { channel, recipient } = req.body; // channel: whatsapp | sms | email
  if (!channel || !recipient) return res.status(400).json({ error: "حدد القناة والمستلم" });

  const db = (await readDb());
  const user = db.users.find(u => u.id === req.user.id);

  const allowance = (user.testAllowance || {})[channel];
  if (!allowance) return res.status(400).json({ error: "قناة غير مدعومة" });
  if (allowance.locked) return res.status(403).json({ error: "تم إيقاف الاختبار على هذه القناة من الأدمن" });
  if (allowance.remaining <= 0) return res.status(402).json({ error: "انتهت رسائل الاختبار المجانية على هذه القناة، تواصل مع الدعم" });

  const template = db.otpTemplates.find(t => t.channel === channel && t.status === "approved") || db.otpTemplates[0];
  const result = await sendOtp(channel, recipient, template.body);

  allowance.remaining -= 1;
  const record = {
    id: uuidv4(),
    clientId: user.id,
    channel,
    recipient,
    status: result.ok ? "delivered" : (result.simulated ? "simulated" : "failed"),
    createdAt: new Date().toISOString()
  };
  db.verifications.push(record);
  await writeDb(db);

  res.json({ result, testAllowance: user.testAllowance, record });
});

// قائمة "مين من عملائي استلم" (سجل التحقق)
router.get("/customers", async (req, res) => {
  const db = (await readDb());
  const list = db.verifications.filter(v => v.clientId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// ---- التذاكر / شات السبورت ----
router.get("/tickets", async (req, res) => {
  const db = (await readDb());
  const tickets = db.tickets.filter(t => t.clientId === req.user.id);
  res.json(tickets);
});

router.post("/tickets", async (req, res) => {
  const { subject } = req.body;
  const db = (await readDb());
  const ticket = { id: uuidv4(), clientId: req.user.id, supportId: null, subject: subject || "طلب دعم", status: "open", createdAt: new Date().toISOString() };
  db.tickets.push(ticket);
  await writeDb(db);
  res.json(ticket);
});

router.get("/tickets/:id/messages", async (req, res) => {
  const db = (await readDb());
  const ticket = db.tickets.find(t => t.id === req.params.id && t.clientId === req.user.id);
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
  res.json(db.ticketMessages.filter(m => m.ticketId === ticket.id));
});

router.post("/tickets/:id/messages", upload.single("file"), async (req, res) => {
  const db = (await readDb());
  const ticket = db.tickets.find(t => t.id === req.params.id && t.clientId === req.user.id);
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const msg = {
    id: uuidv4(),
    ticketId: ticket.id,
    senderId: req.user.id,
    senderRole: "client",
    message: req.body.message || "",
    fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString()
  };
  db.ticketMessages.push(msg);
  await writeDb(db);
  res.json(msg);
});

module.exports = router;
