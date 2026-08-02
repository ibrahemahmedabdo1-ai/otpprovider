const { Sequelize } = require('sequelize');
require('dotenv').config();

// استدعاء صريح لمكتبة pg عشان أدوات البناء (زي @vercel/node) تكتشفها
// وتضمّها في الحزمة النهائية - Sequelize بيستدعيها ديناميكيًا وده بيخلي
// أدوات التحليل الساكن (static analysis) متلاقيهاش من غير الاستدعاء الصريح ده
require('pg');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'postgres') {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // مطلوب لأغلب مزودي Postgres السحابية زي Neon
        },
        connectTimeout: 30000, // مهلة أطول لإعطاء وقت لقاعدة بيانات Neon تصحى من وضع السكون
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      retry: {
        max: 3, // إعادة محاولة الاتصال تلقائيًا لو فشل أول مرة
      },
    }
  );
} else {
  // SQLite - مناسب للتشغيل المحلي والتجربة بدون إعداد قاعدة بيانات خارجية
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false,
  });
}

module.exports = sequelize;
