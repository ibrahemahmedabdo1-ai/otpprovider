require('dotenv').config();
const app = require('../src/app');
const { sequelize } = require('../src/models');

// في بيئة Serverless (Vercel) الدالة بتتنفذ لكل طلب، فبنتأكد إن الاتصال
// بقاعدة البيانات والـ sync بيحصلوا مرة واحدة بس وبنكاش النتيجة بين الطلبات
let dbReadyPromise = null;

function ensureDatabaseReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = sequelize
      .authenticate()
      .then(() => sequelize.sync())
      .catch((err) => {
        dbReadyPromise = null; // نسمح بإعادة المحاولة في الطلب الجاي لو فشل
        throw err;
      });
  }
  return dbReadyPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDatabaseReady();
  } catch (err) {
    res.status(500).json({ error: 'فشل الاتصال بقاعدة البيانات' });
    return;
  }
  return app(req, res);
};
