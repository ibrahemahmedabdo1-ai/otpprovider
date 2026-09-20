// المسار العام اللي عملاء OTP Provider بيستخدموه فعليًا من تطبيقاتهم لإرسال OTP.
// المصادقة هنا بمفتاح API (مش جلسة JWT) — راجع middleware/auth.js -> requireApiKey.
// الإرسال الفعلي يعدي على utils/sms.js اللي بيستخدم Twilio (مزوّد رسمي معتمد من WhatsApp/Meta
// كـ Business Solution Provider) — مفيش أي "أجهزة مربوطة" أو أتمتة غير رسمية هنا، وده الاختيار
// الصح تجاريًا وقانونيًا لإرسال حقيقي بحجم إنتاج بدون خطر حظر الأرقام.

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb } = require("../utils/db");
const { requireApiKey } = require("../middleware/auth");
const billing = require("../utils/billing");
const { sendOtp } = require("../utils/sms");

const router = express.Router();

router.post("/otp/send", requireApiKey, async (req, res) => {
  const { channel, recipient, country } = req.body;
  if (!channel || !recipient) return res.status(400).json({ error: "channel و recipient مطلوبين" });
  if (!["whatsapp", "email"].includes(channel)) {
    return res.status(400).json({ error: "القناة المتاحة حاليًا: whatsapp أو email" });
  }

  const db = await readDb();
  const customer = db.users.find(u => u.id === req.apiCustomerId);
  if (!customer) return res.status(401).json({ error: "الحساب المرتبط بالمفتاح غير موجود" });

  const rule = db.pricingRules.find(r => r.channel === channel && r.active && (!country || r.country === country))
    || db.pricingRules.find(r => r.channel === channel && r.active && !r.country);
  if (!rule) return res.status(400).json({ error: "لا توجد قاعدة تسعير مفعّلة لهذه القناة حاليًا" });

  const isTest = req.apiKeyMode === "test";
  const requiredCredits = rule.creditCost;

  // مفاتيح test تستهلك من رصيد تجريبي مالوش قيمة مالية، مش من رصيد الإنتاج المدفوع
  if (!isTest && customer.balance < requiredCredits) {
    return res.status(402).json({ error: "الرصيد غير كافٍ", requiredCredits, balance: customer.balance });
  }

  const template = db.otpTemplates.find(t => t.channel === channel && t.status === "approved");
  const result = await sendOtp(channel, recipient, template ? template.body : null);

  let ledgerEntry = null;
  if (!isTest) {
    try {
      ledgerEntry = billing.addLedgerEntry(db, {
        customerId: customer.id, type: "consume", amount: requiredCredits,
        note: `إرسال OTP عبر ${channel} إلى ${recipient}`, createdBy: null
      });
    } catch (e) {
      return res.status(402).json({ error: e.message });
    }
  }

  const record = {
    id: uuidv4(),
    clientId: customer.id,
    channel,
    recipient,
    mode: req.apiKeyMode,
    status: result.ok ? "delivered" : (result.simulated ? "simulated" : "failed"),
    creditsCharged: isTest ? 0 : requiredCredits,
    createdAt: new Date().toISOString()
  };
  db.verifications.push(record);

  // لو الإرسال فشل فعليًا (مش simulated) رجّع الرصيد المخصوم تلقائيًا
  if (!isTest && !result.ok && !result.simulated && ledgerEntry) {
    billing.addLedgerEntry(db, {
      customerId: customer.id, type: "refund", amount: requiredCredits,
      relatedOrderId: null, note: `استرداد تلقائي — فشل إرسال OTP (${record.id})`
    });
  }

  await writeDb(db);

  res.json({
    ok: result.ok,
    simulated: !!result.simulated,
    mode: req.apiKeyMode,
    channel,
    creditsCharged: isTest ? 0 : requiredCredits,
    remainingBalance: customer.balance,
    verificationId: record.id
  });
});

module.exports = router;
