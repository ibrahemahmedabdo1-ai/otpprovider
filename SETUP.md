# OTPProvider - تشغيل سريع

## 1) التثبيت

```bash
npm install
```

## 2) إعداد البيئة

عدّل ملف `.env` وضع بيانات Neon / SMTP / Twilio عند الحاجة.

- اترك `DATABASE_URL` فارغًا للتشغيل المحلي باستخدام `data/db.json`.
- في Vercel يجب إضافة متغيرات البيئة من Project Settings.
- لا تستخدم مفاتيح تجريبية في الإنتاج.

## 3) تجهيز الحسابات التجريبية

```bash
npm run seed
```

الحسابات التجريبية التي ينشئها seed:

- Admin: `admin@otpprovider.com` / `Admin@12345`
- Support: `support@otpprovider.com` / `Support@12345`

غيّر كلمات المرور فور تسجيل الدخول في بيئة حقيقية.

## 4) التشغيل

```bash
npm start
```

ثم افتح:

- http://localhost:3000
- http://localhost:3000/login.html
- http://localhost:3000/pricing.html

## 5) النشر على Vercel

- ارفع المشروع مع وجود `package.json` في الجذر.
- أضف `DATABASE_URL` وباقي المتغيرات من إعدادات Vercel.
- لا تعتمد على `data/db.json` في الإنتاج؛ استخدم PostgreSQL/Neon.
- راجع إعدادات مزودي الإرسال واختبرها قبل استقبال عملاء حقيقيين.
