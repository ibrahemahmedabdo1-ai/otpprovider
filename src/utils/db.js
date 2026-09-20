// طبقة تخزين موحّدة:
// - لو DATABASE_URL موجود في .env (مثل رابط Neon.tech) → التخزين يكون في جدول Postgres واحد بعمود JSONB.
//   هذا يشتغل على Vercel لأن التخزين خارجي وليس على القرص المحلي (Vercel serverless ما بيحتفظش بالملفات).
// - لو مفيش DATABASE_URL (تشغيل محلي بدون قاعدة بيانات) → التخزين يكون في ملف data/db.json كـ fallback.
//
// كل الدوال async الآن، فلازم تستخدم: const db = await readDb();  ... await writeDb(db);

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "..", "data", "db.json");

const DEFAULT_DATA = {
  users: [],
  // الباكدجات: كل باكدج له channel محدد: whatsapp | sms | email | bundle (مجمع)
  packages: [
    {
      id: "pkg_starter", name: "Starter", description: "مناسبة لبداية استخدام المنصة",
      price: 10, credits: 10000, currency: "USD",
      channels: { whatsapp: true, email: true },
      apiAccess: true, webhooks: true, support: "standard", higherApiLimits: false,
      features: ["واتساب OTP", "إيميل OTP", "API", "Webhooks", "دعم عادي"],
      popular: false, active: true, visible: true, order: 1,
      promoDiscountPercent: 0, promoExpiresAt: null
    },
    {
      id: "pkg_business", name: "Business", description: "الأكثر طلبًا للفرق المتوسطة",
      price: 25, credits: 30000, currency: "USD",
      channels: { whatsapp: true, email: true },
      apiAccess: true, webhooks: true, support: "priority", higherApiLimits: false,
      features: ["واتساب OTP", "إيميل OTP", "API", "Webhooks", "دعم أولوية"],
      popular: true, active: true, visible: true, order: 2,
      promoDiscountPercent: 0, promoExpiresAt: null
    },
    {
      id: "pkg_professional", name: "Professional", description: "لحجم عمليات أكبر وحدود API أعلى",
      price: 50, credits: 70000, currency: "USD",
      channels: { whatsapp: true, email: true },
      apiAccess: true, webhooks: true, support: "priority", higherApiLimits: true,
      features: ["واتساب OTP", "إيميل OTP", "API", "Webhooks", "دعم أولوية", "حدود API أعلى"],
      popular: false, active: true, visible: true, order: 3,
      promoDiscountPercent: 0, promoExpiresAt: null
    },
    {
      id: "pkg_enterprise", name: "Enterprise", description: "للمنشآت الكبيرة وحجم العمليات المرتفع",
      price: 100, credits: 160000, currency: "USD",
      channels: { whatsapp: true, email: true },
      apiAccess: true, webhooks: true, support: "priority", higherApiLimits: true,
      features: ["واتساب OTP", "إيميل OTP", "API", "Webhooks", "دعم أولوية", "حدود API مرتفعة"],
      popular: false, active: true, visible: true, order: 4,
      promoDiscountPercent: 0, promoExpiresAt: null
    }
  ],
  clientPackages: [],
  services: [],
  verifications: [],
  tickets: [],
  ticketMessages: [],
  adminChats: [],
  // مفاتيح API لكل عميل (test/production) — تُستخدم في POST /v1/otp/send
  apiKeys: [],
  // طلبات الشراء: Package → Order → Payment → Credit Ledger هو المسار المالي الكامل
  orders: [],
  // سجل حركة الرصيد: أي تغيير في رصيد عميل لازم يعدي من هنا (utils/billing.js)
  ledger: [],
  // سجل مراجعة أي تغيير إداري حساس
  auditLog: [],
  // قواعد تسعير استهلاك الـ OTP نفسه (منفصلة تمامًا عن سعر الباكدج) — الأدمن يقدر يغيّرها من غير ما يأثر على سعر الباكدجات
  pricingRules: [
    {
      id: "pr_whatsapp_default", channel: "whatsapp", country: null, countryCode: null,
      providerCost: 0.02, customerCost: 0.05, creditCost: 1, currency: "USD",
      active: true, minBalance: 0, retryCost: 0.5, fallbackCost: 1,
      effectiveFrom: null, effectiveUntil: null
    },
    {
      id: "pr_email_default", channel: "email", country: null, countryCode: null,
      providerCost: 0.005, customerCost: 0.02, creditCost: 1, currency: "USD",
      active: true, minBalance: 0, retryCost: 0.2, fallbackCost: 0.5,
      effectiveFrom: null, effectiveUntil: null
    }
  ],
  coupons: [],
  // طرق الدفع — كل طريقة الأدمن بيفعّلها ويدخل بيانات محفظته بنفسه من لوحة التحكم
  paymentMethods: [
    { id: "pm_binance", type: "binance", label: "Binance Pay", enabled: false, walletAddress: "", network: "", instructions: "", minPayment: 5, requiresConfirmation: true },
    { id: "pm_usdt", type: "usdt", label: "USDT", enabled: false, walletAddress: "", network: "TRC20", instructions: "", minPayment: 5, requiresConfirmation: true },
    { id: "pm_bitcoin", type: "bitcoin", label: "Bitcoin", enabled: false, walletAddress: "", network: "BTC", instructions: "", minPayment: 5, requiresConfirmation: true },
    { id: "pm_manual", type: "manual", label: "تحويل بنكي / يدوي", enabled: true, walletAddress: "", network: "", instructions: "تواصل مع الدعم لإتمام التحويل اليدوي", minPayment: 0, requiresConfirmation: true }
  ],
  otpTemplates: [
    { id: "tpl_wa", channel: "whatsapp", body: "كود التحقق الخاص بك هو {{code}} صالح لمدة 5 دقائق", status: "approved", editedBy: null, pendingBody: null },
    { id: "tpl_sms", channel: "sms", body: "كود التحقق: {{code}}", status: "approved", editedBy: null, pendingBody: null },
    { id: "tpl_email", channel: "email", body: "كود التحقق الخاص بك هو {{code}}", status: "approved", editedBy: null, pendingBody: null }
  ],
  // تسعير لكل رسالة منفردة / 10 / 100 ... لكل قناة على حدة + عروض مجمعة (تُعرض في صفحة /pricing.html)
  pricingTiers: {
    whatsapp: [
      { qty: 1, price: 0.05 }, { qty: 10, price: 0.45 }, { qty: 100, price: 4.0 }, { qty: 1000, price: 35 }
    ],
    sms: [
      { qty: 1, price: 0.07 }, { qty: 10, price: 0.6 }, { qty: 100, price: 5.5 }, { qty: 1000, price: 48 }
    ],
    email: [
      { qty: 1, price: 0.02 }, { qty: 10, price: 0.18 }, { qty: 100, price: 1.6 }, { qty: 1000, price: 14 }
    ],
    bundle: [
      { qty: 10, price: 1.0 }, { qty: 100, price: 9.0 }, { qty: 1000, price: 80 }
    ]
  },
  settings: {
    whatsappConnected: false,
    whatsappQr: null,
    smsProvider: "twilio",
    exchangeRates: { USD: 1, EGP: 49, SAR: 3.75, AED: 3.67, EUR: 0.92 }
  },
  // ٣ لغات للموقع — مخزنة هنا (وليس كملفات) عشان تشتغل على Vercel/serverless بدون مشاكل كتابة على القرص
  languages: {
    ar: {
      brand: "OTP Provider", nav_login: "تسجيل الدخول", nav_register: "حساب جديد",
      nav_home: "الرئيسية", nav_services: "الخدمات", nav_packages: "الباقات",
      nav_api: "API", nav_about: "من نحن", nav_contact: "تواصل معنا",
      ticker_label: "📢 آخر الأخبار",
      ticker_1: "🚀 منصة OTP Provider — تحقق فوري عبر واتساب، إيميل وSMS",
      ticker_2: "⚡ تكامل مباشر مع Twilio وبوابات SMS المحلية",
      ticker_3: "🛡️ حماية وتشفير كامل لبيانات عملائك",
      ticker_4: "💬 دعم فني متاح على مدار الساعة",
      ticker_5: "📦 باقات مرنة تناسب كل حجم أعمال",
      hero_badge: "منصة تحقق OTP عالمية",
      landing_title_1: "تحقق من عملائك",
      landing_title_2: "بثقة، أينما كانوا.",
      landing_title: "تحقق من عملائك بثقة عبر واتساب، إيميل أو SMS",
      landing_subtitle: "منصة واحدة تربط شركتك بعملائها للتحقق الفوري من الهوية ورقم الهاتف عبر واتساب، إيميل أو SMS.",
      cta_start: "ابدأ الآن مجانًا →", cta_packages: "اطّلع على الباقات",
      hero_otp_label: "رمز التحقق",
      stat1_title: "تسليم فوري", stat1_sub: "خلال ثوانٍ",
      stat2_title: "99.9% تشغيل", stat2_sub: "اعتمادية وثبات",
      stat3_title: "تغطية عالمية", stat3_sub: "+200 دولة",
      stat4_title: "أمان بنكي", stat4_sub: "بياناتك محمية",
      services_eyebrow: "خدماتنا", services_title: "منصة واحدة، قنوات متعددة",
      services_sub: "اختار أفضل طريقة لتوصيل رموز التحقق لعملائك، بمعدلات نجاح عالية وتسليم فوري.",
      svc_whatsapp_title: "واتساب", svc_whatsapp_desc: "أرسل رموز التحقق مباشرة عبر واتساب برسالة جاهزة أو مخصصة.",
      svc_email_title: "إيميل", svc_email_desc: "تحقق فوري عبر البريد الإلكتروني لعملائك حول العالم.",
      svc_sms_title: "SMS", svc_sms_desc: "تكامل مباشر مع Twilio وبوابات SMS المحلية.",
      svc_dash_title: "لوحة تحكم و API كامل", svc_dash_desc: "تابع رصيدك، عملاءك، وتكامل عبر API موثّق، من مكان واحد.",
      pkg_eyebrow: "باقاتنا", pkg_title: "خطط مرنة لكل حجم أعمال",
      pkg_sub: "اختار الباقة المناسبة لحجم أعمالك — وسّع أو قلّل في أي وقت.",
      check_realtime: "تسليم فوري", check_multichannel: "قنوات متعددة",
      check_failover: "دعم Failover", check_logs: "سجلات تفصيلية", check_support: "دعم 24/7",
      cta_box_title: "جاهز تبدأ التحقق من عملائك؟",
      cta_box_sub: "ابدأ إرسال رموز OTP الآمنة حول العالم مع OTP Provider.",
      cta_box_btn: "أنشئ حسابك المجاني →",
      footer_about: "منصة واحدة لتحقق عملائك عبر واتساب، إيميل وSMS بثقة وسرعة.",
      footer_service: "الخدمة", footer_start: "ابدأ الآن",
      footer_channels: "القنوات", footer_support: "الدعم",
      footer_contact_support: "تواصل مع الدعم", footer_create_account: "إنشاء حساب",
      footer_follow: "تابعنا", footer_rights: "جميع الحقوق محفوظة",
      footer_tagline: "شريكك الموثوق للتحقق حول العالم",
      pricing_eyebrow: "التسعير", pricing_sub: "سعر كل قناة منفصل تمامًا — ادفع فقط على ما تستخدمه.",
      login_title: "تسجيل الدخول", register_title: "إنشاء حساب جديد",
      email: "البريد الإلكتروني", password: "كلمة المرور", name: "الاسم", submit: "دخول",
      submit_register: "تسجيل", dashboard: "لوحة التحكم", balance: "الرصيد", packages: "الباكدجات",
      buy: "شراء", test_button: "اختبار إرسال", customers: "عملاؤك", support_chat: "الدردشة مع الدعم",
      logout: "تسجيل خروج", language: "اللغة", pricing_title: "الأسعار"
    },
    en: {
      brand: "OTP Provider", nav_login: "Login", nav_register: "Sign Up",
      nav_home: "Home", nav_services: "Services", nav_packages: "Packages",
      nav_api: "API", nav_about: "About", nav_contact: "Contact",
      ticker_label: "📢 Latest News",
      ticker_1: "🚀 OTP Provider platform — instant verification via WhatsApp, Email and SMS",
      ticker_2: "⚡ Direct integration with Twilio and local SMS gateways",
      ticker_3: "🛡️ Full protection and encryption for your customers' data",
      ticker_4: "💬 Support available around the clock",
      ticker_5: "📦 Flexible packages for every business size",
      hero_badge: "Global OTP Verification Platform",
      landing_title_1: "Verify your customers",
      landing_title_2: "with confidence, worldwide.",
      landing_title: "Verify your customers confidently via WhatsApp, Email or SMS",
      landing_subtitle: "One platform connecting your company to your customers for instant identity and phone verification via WhatsApp, Email or SMS.",
      cta_start: "Start Free Now →", cta_packages: "View Packages",
      hero_otp_label: "Your OTP Code",
      stat1_title: "Instant Delivery", stat1_sub: "In seconds",
      stat2_title: "99.9% Uptime", stat2_sub: "Reliable & stable",
      stat3_title: "Global Coverage", stat3_sub: "200+ Countries",
      stat4_title: "Bank-Level Security", stat4_sub: "Your data is safe",
      services_eyebrow: "Our Services", services_title: "One Platform, Multiple Channels",
      services_sub: "Choose the best way to deliver OTPs to your users, with high success rates and real-time delivery.",
      svc_whatsapp_title: "WhatsApp", svc_whatsapp_desc: "Send OTP codes directly via WhatsApp with a ready or custom message.",
      svc_email_title: "Email", svc_email_desc: "Instant email verification for your customers worldwide.",
      svc_sms_title: "SMS", svc_sms_desc: "Direct integration with Twilio and local SMS gateways.",
      svc_dash_title: "Dashboard & Full API", svc_dash_desc: "Track your balance, customers, and integrate via documented API, all in one place.",
      pkg_eyebrow: "Our Packages", pkg_title: "Flexible Plans for Every Business",
      pkg_sub: "Choose the plan that fits your business size — scale up or down anytime.",
      check_realtime: "Real-time Delivery", check_multichannel: "Multi-Channel",
      check_failover: "Failover Support", check_logs: "Detailed Logs", check_support: "24/7 Support",
      cta_box_title: "Ready to power your verification?",
      cta_box_sub: "Start sending secure OTPs worldwide with OTP Provider.",
      cta_box_btn: "Create Your Free Account →",
      footer_about: "One platform to verify your customers via WhatsApp, Email and SMS with confidence and speed.",
      footer_service: "Service", footer_start: "Get Started",
      footer_channels: "Channels", footer_support: "Support",
      footer_contact_support: "Contact Support", footer_create_account: "Create Account",
      footer_follow: "Follow Us", footer_rights: "All rights reserved",
      footer_tagline: "Your trusted verification partner worldwide",
      pricing_eyebrow: "Pricing", pricing_sub: "Each channel is priced separately — pay only for what you use.",
      login_title: "Login", register_title: "Create New Account",
      email: "Email", password: "Password", name: "Name", submit: "Login",
      submit_register: "Register", dashboard: "Dashboard", balance: "Balance", packages: "Packages",
      buy: "Buy", test_button: "Send Test", customers: "Your Customers", support_chat: "Support Chat",
      logout: "Logout", language: "Language", pricing_title: "Pricing"
    },
    fr: {
      brand: "OTP Provider", nav_login: "Connexion", nav_register: "Inscription",
      nav_home: "Accueil", nav_services: "Services", nav_packages: "Offres",
      nav_api: "API", nav_about: "A propos", nav_contact: "Contact",
      ticker_label: "📢 Dernieres nouvelles",
      ticker_1: "🚀 OTP Provider — verification instantanee via WhatsApp, Email et SMS",
      ticker_2: "⚡ Integration directe avec Twilio et les passerelles SMS locales",
      ticker_3: "🛡️ Protection et chiffrement complets des donnees de vos clients",
      ticker_4: "💬 Support disponible 24h/24",
      ticker_5: "📦 Offres flexibles pour toutes les tailles d'entreprise",
      hero_badge: "Plateforme mondiale de verification OTP",
      landing_title_1: "Verifiez vos clients",
      landing_title_2: "en toute confiance, partout.",
      landing_title: "Verifiez vos clients en toute confiance via WhatsApp, Email ou SMS",
      landing_subtitle: "Une seule plateforme reliant votre entreprise a vos clients pour une verification instantanee via WhatsApp, Email ou SMS.",
      cta_start: "Commencer Gratuitement →", cta_packages: "Voir les offres",
      hero_otp_label: "Votre code OTP",
      stat1_title: "Livraison instantanee", stat1_sub: "En quelques secondes",
      stat2_title: "99.9% de disponibilite", stat2_sub: "Fiable et stable",
      stat3_title: "Couverture mondiale", stat3_sub: "200+ pays",
      stat4_title: "Securite bancaire", stat4_sub: "Vos donnees sont protegees",
      services_eyebrow: "Nos services", services_title: "Une plateforme, plusieurs canaux",
      services_sub: "Choisissez le meilleur moyen de livrer les OTP a vos utilisateurs, avec des taux de reussite eleves.",
      svc_whatsapp_title: "WhatsApp", svc_whatsapp_desc: "Envoyez des codes OTP directement via WhatsApp avec un message pret ou personnalise.",
      svc_email_title: "Email", svc_email_desc: "Verification instantanee par email pour vos clients dans le monde entier.",
      svc_sms_title: "SMS", svc_sms_desc: "Integration directe avec Twilio et les passerelles SMS locales.",
      svc_dash_title: "Tableau de bord et API complete", svc_dash_desc: "Suivez votre solde, vos clients, et integrez via une API documentee, en un seul endroit.",
      pkg_eyebrow: "Nos offres", pkg_title: "Des plans flexibles pour chaque entreprise",
      pkg_sub: "Choisissez l'offre adaptee a votre activite — evoluez a tout moment.",
      check_realtime: "Livraison en temps reel", check_multichannel: "Multi-canal",
      check_failover: "Support de secours", check_logs: "Journaux detailles", check_support: "Support 24/7",
      cta_box_title: "Pret a booster votre verification ?",
      cta_box_sub: "Commencez a envoyer des OTP securises dans le monde entier avec OTP Provider.",
      cta_box_btn: "Creer votre compte gratuit →",
      footer_about: "Une seule plateforme pour verifier vos clients via WhatsApp, Email et SMS, en toute confiance.",
      footer_service: "Service", footer_start: "Commencer",
      footer_channels: "Canaux", footer_support: "Support",
      footer_contact_support: "Contacter le support", footer_create_account: "Creer un compte",
      footer_follow: "Suivez-nous", footer_rights: "Tous droits reserves",
      footer_tagline: "Votre partenaire de verification de confiance dans le monde",
      pricing_eyebrow: "Tarification", pricing_sub: "Chaque canal a son propre prix — payez seulement ce que vous utilisez.",
      login_title: "Connexion", register_title: "Creer un compte",
      email: "Email", password: "Mot de passe", name: "Nom", submit: "Connexion",
      submit_register: "S inscrire", dashboard: "Tableau de bord", balance: "Solde", packages: "Offres",
      buy: "Acheter", test_button: "Envoyer un test", customers: "Vos clients", support_chat: "Chat Support",
      logout: "Deconnexion", language: "Langue", pricing_title: "Tarifs"
    }
  }
};

function defaultTestAllowance() {
  return {
    whatsapp: { remaining: 3, locked: false },
    sms: { remaining: 3, locked: false },
    email: { remaining: 3, locked: false }
  };
}

// ---------------- Postgres (Neon) backend ----------------
let pool = null;
let tableReadyPromise = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureTable() {
  const p = getPool();
  await p.query(`CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL)`);
  const { rows } = await p.query("SELECT data FROM app_state WHERE id = 1");
  if (rows.length === 0) {
    await p.query("INSERT INTO app_state (id, data) VALUES (1, $1)", [JSON.stringify(DEFAULT_DATA)]);
  }
}

async function readDbPg() {
  if (!tableReadyPromise) tableReadyPromise = ensureTable();
  await tableReadyPromise;
  const p = getPool();
  const { rows } = await p.query("SELECT data FROM app_state WHERE id = 1");
  return rows[0].data;
}

async function writeDbPg(data) {
  if (!tableReadyPromise) tableReadyPromise = ensureTable();
  await tableReadyPromise;
  const p = getPool();
  await p.query("UPDATE app_state SET data = $1 WHERE id = 1", [JSON.stringify(data)]);
}

// ---------------- Local JSON file backend (fallback للتطوير المحلي بدون قاعدة بيانات) ----------------
function ensureLocalFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

async function readDbLocal() {
  ensureLocalFile();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

async function writeDbLocal(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------------- الواجهة الموحدة ----------------

// عند ترقية المشروع بحقول/مفاتيح جديدة (زي نظام الفوترة الجديد)، قواعد البيانات
// القديمة المحفوظة عند المستخدم (data/db.json أو Neon) ما بتاخدش الحقول الجديدة
// تلقائيًا لأن DEFAULT_DATA بيتطبق أول مرة بس. الدالة دي بتكمّل أي حقل ناقص
// (سواء ترجمة أو مجموعة بيانات كاملة زي pricingRules/coupons) من غير ما تلمس
// أي قيمة المستخدم عدّلها بنفسه.
function migrateSchema(data) {
  let changed = false;

  if (!data.languages) { data.languages = {}; changed = true; }
  for (const lang of Object.keys(DEFAULT_DATA.languages)) {
    if (!data.languages[lang]) {
      data.languages[lang] = { ...DEFAULT_DATA.languages[lang] };
      changed = true;
      continue;
    }
    for (const key of Object.keys(DEFAULT_DATA.languages[lang])) {
      if (!(key in data.languages[lang])) {
        data.languages[lang][key] = DEFAULT_DATA.languages[lang][key];
        changed = true;
      }
    }
  }

  // مجموعات بيانات جديدة كاملة (لو المشروع كان أقدم من إضافتها، تتضاف فاضية أو بالقيم الافتراضية)
  const newCollections = ["apiKeys", "orders", "ledger", "auditLog"];
  for (const key of newCollections) {
    if (!Array.isArray(data[key])) { data[key] = []; changed = true; }
  }
  if (!Array.isArray(data.pricingRules)) {
    data.pricingRules = JSON.parse(JSON.stringify(DEFAULT_DATA.pricingRules));
    changed = true;
  }
  if (!Array.isArray(data.coupons)) { data.coupons = []; changed = true; }
  if (!Array.isArray(data.paymentMethods)) {
    data.paymentMethods = JSON.parse(JSON.stringify(DEFAULT_DATA.paymentMethods));
    changed = true;
  }

  return { data, changed };
}

async function readDb() {
  const raw = getPool() ? await readDbPg() : await readDbLocal();
  const { data, changed } = migrateSchema(raw);
  if (changed) {
    await (getPool() ? writeDbPg(data) : writeDbLocal(data));
  }
  return data;
}

async function writeDb(data) {
  return getPool() ? writeDbPg(data) : writeDbLocal(data);
}

module.exports = { readDb, writeDb, DB_PATH, defaultTestAllowance, DEFAULT_DATA };
