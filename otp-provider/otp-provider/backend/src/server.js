require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const panelRoutes = require('./routes/panelRoutes');
const clientRoutes = require('./routes/clientRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

// نتأكد من جاهزية قاعدة البيانات مرة واحدة فقط (بيتم تخزينها مؤقتًا بعد أول نجاح)
let dbReadyPromise = null;
function ensureDatabaseReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = sequelize.authenticate().then(() => sequelize.sync());
  }
  return dbReadyPromise;
}

// بيئة Vercel Serverless بتحدد المتغير ده تلقائيًا
// في السيرفرليس مينفعش نستخدم app.listen() لأن Vercel بياخد الـ app
// نفسها ويشغّلها كـ handler مباشر لكل طلب - فبدل كده بنتأكد من
// جاهزية قاعدة البيانات في كل طلب عن طريق middleware
const isServerless = !!process.env.VERCEL;

if (isServerless) {
  app.use(async (req, res, next) => {
    try {
      await ensureDatabaseReady();
      next();
    } catch (err) {
      console.error('فشل الاتصال بقاعدة البيانات:', err);
      res.status(500).json({ error: 'فشل الاتصال بقاعدة البيانات' });
    }
  });
}

// ===== الراوتس =====
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/panel', panelRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/v1', publicApiRoutes);
app.use('/api/system', systemRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'otp-provider-backend' }));

app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
});

if (!isServerless) {
  // تشغيل محلي أو على سيرفر تقليدي (Render/Railway/VPS)
  const PORT = process.env.PORT || 4000;
  ensureDatabaseReady()
    .then(() => {
      console.log('تم الاتصال بقاعدة البيانات بنجاح');
      app.listen(PORT, () => {
        console.log('السيرفر شغال على http://localhost:' + PORT);
      });
    })
    .catch((err) => {
      console.error('فشل الاتصال بقاعدة البيانات:', err);
      process.exit(1);
    });
}

module.exports = app;
