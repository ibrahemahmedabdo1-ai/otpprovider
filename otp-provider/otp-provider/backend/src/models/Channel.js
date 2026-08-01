const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * القنوات: أرقام واتساب، حسابات إيميل، بوابات SMS
 * يربطها الأدمن فقط، وتُستخدم لإرسال رسائل التحقق للعملاء
 */
const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('whatsapp', 'email', 'sms'),
    allowNull: false,
  },
  // رقم الهاتف أو عنوان الإيميل أو اسم بوابة الـ SMS
  identifier: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // اسم المزوّد: twilio, smtp, vonage...الخ
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // بيانات اعتماد المزوّد (مشفرة/محفوظة بأمان في نظام إنتاجي حقيقي)
  credentials: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  // وضع التخصيص: dedicated = مخصص لعميل واحد فقط, shared = مشترك بين كل العملاء
  assignmentMode: {
    type: DataTypes.ENUM('dedicated', 'shared'),
    defaultValue: 'shared',
  },
  dedicatedClientId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'faulty'),
    defaultValue: 'active',
  },
  lastCheckedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'channels',
  timestamps: true,
});

module.exports = Channel;
