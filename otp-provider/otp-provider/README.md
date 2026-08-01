# OTP Provider — خدمة تحقق (OTP) لأصحاب المواقع والشركات

مشروع بنفس فكرة **Twilio Verify**: خدمة SaaS تتيح لأصحاب المواقع والتطبيقات إرسال أكواد تحقق (OTP)
لمستخدميهم عبر **واتساب / إيميل / SMS**، مع لوحة تحكم كاملة للأدمن، تطبيق منفصل لفريق الدعم (سبورت)
بصلاحيات دقيقة، ولوحة للعميل نفسه لمتابعة رصيده واستخدامه.

## هيكل المشروع

```
otp-provider/
├── backend/          # الـ API الرئيسي (Node.js + Express + Sequelize)
├── admin-panel/       # لوحة الأدمن (React) - تحكم كامل في النظام
└── support-panel/     # تطبيق السبورت (React) - صلاحيات محددة من الأدمن
```

## 1) الأدمن (Admin Panel)
المتحكم الوحيد الكامل في النظام:
- إدارة كل العملاء (إنشاء، تفعيل، إيقاف، بحث بالاسم/الإيميل)
- إدارة الباكدجات (السعر، عدد الرسائل، القناة)
- ربط قنوات جديدة (أرقام واتساب، حسابات إيميل، بوابات SMS) وتحديد كل قناة **مخصصة** لعميل واحد
  أو **مشتركة** لكل العملاء
- إنشاء حسابات سبورت وتحديد صلاحياتهم بدقة (مشاهدة العملاء، المحادثة، الشحن، التفعيل، اكتشاف الأعطال)
- محادثة مباشرة مع كل عميل من داخل بروفايله
- زر **"اكتشف العطل"** لفحص حالة القنوات المرتبطة بالعميل فورًا

## 2) تطبيق السبورت (Support Panel)
- يرى كل بيانات العملاء (بالاسم/الإيميل) وكل عملياتهم، لكن **بدون** أي تحكم في إعدادات النظام
- الصلاحيات تُمنح فرديًا من الأدمن: مشاهدة، محادثة، شحن، تفعيل/إيقاف، اكتشاف أعطال
- محادثة مع العميل من نفس بروفايله
- زر اكتشف العطل (لو عنده الصلاحية)

## 3) الـ API العام (لموقع/تطبيق العميل)
نفس منطق Twilio Verify - العميل يستخدم `apiKey` + `apiSecret` من سيرفره الخاص (وليس من المتصفح):

```
POST /api/v1/otp/send
Headers: X-API-Key, X-API-Secret
Body: { "channel": "whatsapp|email|sms", "recipient": "+201234567", "purpose": "login_verification" }

POST /api/v1/otp/verify
Headers: X-API-Key, X-API-Secret
Body: { "otpId": "...", "code": "123456" }
```

> ملاحظة أمان مهمة: هذا الـ API مخصص ليُستدعى من **سيرفر** العميل (Backend-to-Backend) وليس من متصفح
> المستخدم النهائي مباشرة، تمامًا مثل Twilio — حتى لا يتم كشف الـ apiSecret.

## آلية الرسائل التجريبية (Trial Messages)
عند أول عملية شحن (Ship) لأي عميل جديد، يحصل تلقائيًا على **10 رسائل اختبار مجانية** موزّعة على
القنوات الثلاث (واتساب/إيميل/SMS) — مطبّقة في `backend/src/controllers/transactionController.js`.

## التشغيل محليًا

### المتطلبات
- Node.js 18+ و npm

### 1. الباك اند
```bash
cd backend
cp .env.example .env      # عدّل القيم حسب بيئتك (خصوصًا JWT_SECRET ومفاتيح Twilio/SMTP)
npm install
npm run seed               # ينشئ أول حساب أدمن + باكدجات وقنوات تجريبية
npm run dev                 # يشتغل على http://localhost:4000
```
بيانات دخول الأدمن الافتراضية بعد الـ seed:
```
Email: admin@otpprovider.com
Password: ChangeMe123!
```
**غيّر كلمة المرور فورًا من قاعدة البيانات أو أضف صفحة تغيير كلمة مرور قبل الإنتاج.**

قاعدة البيانات الافتراضية SQLite (ملف `database.sqlite`) لسهولة التجربة بدون إعداد.
للإنتاج، غيّر في `.env`:
```
DB_DIALECT=postgres
DB_HOST=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
```

### 2. لوحة الأدمن
```bash
cd admin-panel
npm install
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
npm run dev                 # يشتغل على http://localhost:5173
```

### 3. تطبيق السبورت
```bash
cd support-panel
npm install
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
npm run dev                 # يشتغل على منفذ آخر (Vite هيختاره تلقائيًا لو 5173 مشغول)
```

## ربط مزوّدي الإرسال الحقيقيين
المشروع يعمل افتراضيًا في **وضع محاكاة** (Simulated Mode) — أي رسالة تُطبع في الـ console بدل
إرسالها فعليًا، طالما مفاتيح Twilio/SMTP فاضية في `.env`. لتفعيل الإرسال الحقيقي:
- **واتساب/SMS**: أضف `TWILIO_ACCOUNT_SID` و `TWILIO_AUTH_TOKEN` في `.env`
- **إيميل**: أضف `SMTP_HOST` و `SMTP_USER` و `SMTP_PASSWORD`

## النشر على دومين (Otppprovider.com)
1. ارفع مجلد `backend` على سيرفر (VPS/Render/Railway) وشغّله كخدمة Node.js دائمة (PM2 مثلاً)
2. اعمل `npm run build` في `admin-panel` و `support-panel` وارفع مجلد `dist` الناتج على استضافة
   ستاتيك (Vercel/Netlify) أو على نفس السيرفر خلف Nginx
3. اربط الدومين الرئيسي بالـ backend API (مثلاً `api.otpprovider.com`)، وسب-دومين للوحة الأدمن
   (`admin.otpprovider.com`) وتطبيق السبورت (`support.otpprovider.com`)
4. فعّل HTTPS (Let's Encrypt) على كل الدومينات

## الأمان — نقاط مهمة قبل الإنتاج
- غيّر `JWT_SECRET` لقيمة عشوائية طويلة
- لا تستخدم SQLite في الإنتاج تحت حمل حقيقي — انقل لـ PostgreSQL
- فعّل HTTPS إجباري، و rate limiting أشمل
- راجع صلاحيات كل سبورت بانتظام من لوحة الأدمن
- أكواد OTP تُحفظ مشفّرة (bcrypt hash) في قاعدة البيانات ولا تُعاد أبدًا في أي استجابة API
