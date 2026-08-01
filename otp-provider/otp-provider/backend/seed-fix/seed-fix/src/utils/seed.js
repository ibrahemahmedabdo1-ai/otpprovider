require('dotenv').config();
const { runSeed } = require('./seedRunner');

// سكريبت CLI للتشغيل المحلي أو على سيرفر تقليدي: npm run seed
runSeed()
  .then((log) => {
    log.forEach((line) => console.log('✅ ' + line));
    console.log('🎉 تم الانتهاء من الـ Seed بنجاح');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ فشل الـ Seed:', err);
    process.exit(1);
  });
