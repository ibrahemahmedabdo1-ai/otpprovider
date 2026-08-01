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
          rejectUnauthorized: false,
        },
      },
    }
  );
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false,
  });
}

module.exports = sequelize;
