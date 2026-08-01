const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const panelRoutes = require('./routes/panelRoutes');
const clientRoutes = require('./routes/clientRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ===== الراوتس =====
app.use('/api/auth', authRoutes);          // تسجيل دخول الأدمن/السبورت/العميل
app.use('/api/admin', adminRoutes);        // الأدمن فقط: سبورت، باكدجات، قنوات
app.use('/api/panel', panelRoutes);        // مشترك (أدمن+سبورت بصلاحيات): عملاء، شات، شحن، اكتشف عطل
app.use('/api/client', clientRoutes);      // لوحة العميل نفسه
app.use('/api/v1', publicApiRoutes);       // الـ API العام لإرسال/تأكيد OTP (لموقع العميل)
app.use('/api/system', systemRoutes);      // أدوات نظام محمية (زي seed أول مرة على Vercel)

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'otp-provider-backend' }));

app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
});

module.exports = app;
