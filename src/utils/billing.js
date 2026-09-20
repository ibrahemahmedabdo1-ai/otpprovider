// طبقة الفوترة المشتركة: ليدجر الرصيد، سجل المراجعة (audit log)، حساب الكوبونات، وتحليلات الربح.
// كل تغيير في رصيد عميل لازم يعدي من هنا (addLedgerEntry) — ممنوع نعدل user.balance مباشرة
// في أي مكان تاني في المشروع، عشان يفضل فيه سجل كامل قابل للتتبع لكل عملية.
//
// ملحوظة مهمة عن "المعاملات الذرية": التخزين هنا مستند JSON واحد (ملف محلي أو عمود JSONB
// في Postgres)، مش قاعدة بيانات علائقية بمعاملات (transactions) حقيقية بمستوى الصفوف.
// كل دالة هنا بتقرأ db، تعدّل، وتكتب في نفس العملية (readDb → تعديل → writeDb) عشان تقلل فرص
// تعارض الكتابة، لكن ده مش ضمان ACID كامل تحت حمل عالي متزامن. لو المشروع كبر وحصل تزامن كتير
// (آلاف الطلبات/الثانية)، الخطوة الصح بعد كده هي ترحيل التخزين لقاعدة علائقية (Postgres بجداول
// حقيقية) مع معاملات DB فعلية بدل مستند JSON واحد.

const { v4: uuidv4 } = require("uuid");

function newId(prefix) {
  return `${prefix}_${uuidv4()}`;
}

// ---- Ledger: كل عملية رصيد لازم تتسجل هنا وتكون immutable (مفيش تعديل على سجل قديم) ----
function addLedgerEntry(db, { customerId, type, amount, currency = "credits", relatedOrderId = null, note = "", createdBy = null }) {
  const user = db.users.find(u => u.id === customerId);
  if (!user) throw new Error("العميل غير موجود");

  const allowedTypes = ["purchase", "consume", "refund", "bonus", "promo", "test", "adjustment"];
  if (!allowedTypes.includes(type)) throw new Error("نوع عملية غير معروف");

  // النوع بيحدد الاتجاه: شراء/بونص/استرداد/عرض = إضافة، استهلاك = خصم
  const direction = ["consume"].includes(type) ? -1 : 1;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Ledger amount must be a positive number");
  const signedAmount = Math.abs(numericAmount) * direction;

  if (type === "consume" && user.balance + signedAmount < 0) {
    throw new Error("الرصيد غير كافٍ لإتمام العملية");
  }

  user.balance = Math.round((user.balance + signedAmount) * 100) / 100;

  if (!db.ledger) db.ledger = [];
  const entry = {
    id: newId("ldg"),
    customerId,
    type,
    amount: signedAmount,
    balanceAfter: user.balance,
    currency,
    relatedOrderId,
    note,
    createdBy,
    createdAt: new Date().toISOString()
  };
  db.ledger.push(entry);
  return entry;
}

// ---- Audit log: أي تغيير إداري حساس (سعر، كوبون، دفعة، رصيد يدوي...) ----
function logAudit(db, { adminId, action, before = null, after = null, ip = null }) {
  if (!db.auditLog) db.auditLog = [];
  const entry = {
    id: newId("aud"),
    adminId,
    action,
    before,
    after,
    ip,
    createdAt: new Date().toISOString()
  };
  db.auditLog.push(entry);
  return entry;
}

// ---- حساب سعر بعد كوبون/خصم باكدج ----
function applyCoupon(db, coupon, packagePrice, customerId) {
  if (!coupon || !coupon.active) return { finalPrice: packagePrice, discount: 0, bonusCredits: 0, error: coupon ? null : "كوبون غير موجود" };

  const now = new Date();
  if (coupon.startDate && now < new Date(coupon.startDate)) return { error: "الكوبون لسه مفعلش" };
  if (coupon.expirationDate && now > new Date(coupon.expirationDate)) return { error: "الكوبون منتهي" };
  if (coupon.minimumPurchase && packagePrice < coupon.minimumPurchase) {
    return { error: `الحد الأدنى للشراء لاستخدام الكوبون هو ${coupon.minimumPurchase}` };
  }
  if (coupon.maxUses != null && (coupon.usedCount || 0) >= coupon.maxUses) {
    return { error: "انتهت عدد مرات استخدام هذا الكوبون" };
  }
  if (coupon.perCustomerLimit != null) {
    const usedByCustomer = (db.orders || []).filter(
      o => o.customerId === customerId && o.couponCode === coupon.code && o.status !== "cancelled"
    ).length;
    if (usedByCustomer >= coupon.perCustomerLimit) return { error: "استخدمت هذا الكوبون بالحد الأقصى المسموح" };
  }

  let discount = 0;
  let bonusCredits = coupon.bonusCredits || 0;
  if (coupon.type === "percentage") discount = packagePrice * (coupon.value / 100);
  if (coupon.type === "fixed") discount = coupon.value;
  discount = Math.min(discount, packagePrice);

  return { finalPrice: Math.round((packagePrice - discount) * 100) / 100, discount, bonusCredits, error: null };
}

// ---- تحليلات الربح لفترة زمنية معينة ----
function statsForRange(db, from, to) {
  const inRange = (iso) => {
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const paidOrders = (db.orders || []).filter(o => o.status === "paid" && inRange(o.paidAt || o.createdAt));
  const consumeEntries = (db.ledger || []).filter(l => l.type === "consume" && inRange(l.createdAt));

  const revenue = paidOrders.reduce((s, o) => s + (o.finalPrice || 0), 0);
  const creditsSold = paidOrders.reduce((s, o) => s + (o.creditsGranted || 0), 0);
  const creditsConsumed = consumeEntries.reduce((s, l) => s + Math.abs(l.amount), 0);

  // تكلفة تقريبية = مجموع (عدد الرسائل المستهلكة لكل قناة × تكلفة المزوّد لكل رسالة من PricingRule)
  let providerCost = 0;
  const rulesByChannel = {};
  (db.pricingRules || []).forEach(r => { if (r.active) rulesByChannel[r.channel] = r; });
  (db.verifications || []).filter(v => inRange(v.createdAt) && v.status !== "failed").forEach(v => {
    const rule = rulesByChannel[v.channel];
    if (rule) providerCost += Number(rule.providerCost || 0);
  });

  const grossProfit = revenue - providerCost;
  const profitPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const otpCount = (db.verifications || []).filter(v => inRange(v.createdAt)).length;

  return {
    revenue: round2(revenue),
    providerCost: round2(providerCost),
    grossProfit: round2(grossProfit),
    profitPercent: round2(profitPercent),
    creditsSold,
    creditsConsumed,
    otpCount,
    costPerOtp: otpCount ? round2(providerCost / otpCount) : 0,
    revenuePerOtp: otpCount ? round2(revenue / otpCount) : 0,
    profitPerOtp: otpCount ? round2(grossProfit / otpCount) : 0
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

function dayRange(daysAgo = 0) {
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - daysAgo); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}

function profitOverview(db) {
  const now = new Date();
  const last7 = new Date(now); last7.setDate(last7.getDate() - 7);
  const last30 = new Date(now); last30.setDate(last30.getDate() - 30);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const today = dayRange(0);
  const yesterday = dayRange(1);

  return {
    today: statsForRange(db, today.from, today.to),
    yesterday: statsForRange(db, yesterday.from, yesterday.to),
    last7Days: statsForRange(db, last7, now),
    last30Days: statsForRange(db, last30, now),
    currentMonth: statsForRange(db, monthStart, now),
    previousMonth: statsForRange(db, prevMonthStart, prevMonthEnd)
  };
}

function assertNonNegativeNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number`);
  return n;
}

function validatePackageInput(input) {
  if (input.price !== undefined) assertNonNegativeNumber(input.price, "price");
  if (input.credits !== undefined) assertNonNegativeNumber(input.credits, "credits");
  if (input.order !== undefined) assertNonNegativeNumber(input.order, "order");
  if (input.name !== undefined && (!String(input.name).trim() || String(input.name).length > 120)) throw new Error("Invalid package name");
  if (input.currency !== undefined && !/^[A-Z]{3}$/.test(String(input.currency))) throw new Error("Invalid currency");
}

function validatePricingRuleInput(input) {
  for (const field of ["providerCost", "customerCost", "creditCost", "retryCost", "fallbackCost", "minBalance"]) {
    if (input[field] !== undefined) assertNonNegativeNumber(input[field], field);
  }
  if (input.currency !== undefined && !/^[A-Z]{3}$/.test(String(input.currency))) throw new Error("Invalid currency");
  if (input.channel !== undefined && !/^[a-z][a-z0-9_-]{1,31}$/.test(String(input.channel))) throw new Error("Invalid channel");
}

module.exports = { newId, addLedgerEntry, logAudit, applyCoupon, statsForRange, profitOverview, validatePackageInput, validatePricingRuleInput };
