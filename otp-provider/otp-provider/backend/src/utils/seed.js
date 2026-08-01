require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, StaffUser, Package, Channel } = require('../models');

async function seed() {
  await sequelize.sync();

  // ===== إنشاء أول حساب أدمن =====
  const adminEmail = 'admin@otpprovider.com';
  const existingAdmin = await StaffUser.findOne({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('ChangeMe123!', 10);
    await StaffUser.create({
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      permissions: {
        viewClients: true,
        chatWithClients: true,
        shipPackages: true,
        activateClients: true,
        manageChannels: true,
        diagnoseFaults: true,
      },
    });
    console.log(`✅ تم إنشاء حساب الأدمن: ${adminEmail} / ChangeMe123!`);
    console.log('⚠️  غيّر كلمة المرور فورًا بعد أول تسجيل دخول');
  } else {
    console.log('ℹ️  حساب الأدمن موجود بالفعل');
  }

  // ===== باكدجات تجريبية =====
  const packagesCount = await Package.count();
  if (packagesCount === 0) {
    await Package.bulkCreate([
      { name: 'باقة البداية - واتساب', channelType: 'whatsapp', messageCount: 500, price: 20, description: '500 رسالة تحقق عبر واتساب' },
      { name: 'باقة البداية - إيميل', channelType: 'email', messageCount: 1000, price: 10, description: '1000 رسالة تحقق عبر البريد الإلكتروني' },
      { name: 'باقة البداية - SMS', channelType: 'sms', messageCount: 300, price: 25, description: '300 رسالة تحقق عبر SMS' },
      { name: 'الباقة الشاملة', channelType: 'all', messageCount: 1000, price: 45, description: '1000 رسالة على كل القنوات (واتساب/إيميل/SMS)' },
    ]);
    console.log('✅ تم إنشاء باكدجات تجريبية');
  }

  // ===== قناة تجريبية مشتركة لكل نوع (وضع محاكاة بدون مفاتيح حقيقية) =====
  const channelsCount = await Channel.count();
  if (channelsCount === 0) {
    await Channel.bulkCreate([
      { type: 'whatsapp', identifier: '+14155238886', provider: 'twilio', assignmentMode: 'shared', status: 'active' },
      { type: 'email', identifier: 'no-reply@otpprovider.com', provider: 'smtp', assignmentMode: 'shared', status: 'active' },
      { type: 'sms', identifier: '+1234567890', provider: 'twilio', assignmentMode: 'shared', status: 'active' },
    ]);
    console.log('✅ تم إنشاء قنوات تجريبية (وضع محاكاة)');
  }

  console.log('🎉 تم الانتهاء من الـ Seed بنجاح');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ فشل الـ Seed:', err);
  process.exit(1);
});
