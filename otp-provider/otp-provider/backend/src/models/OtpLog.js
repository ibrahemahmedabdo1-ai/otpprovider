const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * سجل كل رسالة تحقق (OTP) تم إرسالها لصالح عميل معيّن
 * ملاحظة: الكود يُحفظ مُشفّر (hash) وليس نص صريح لأسباب أمنية
 */
const OtpLog = sequelize.define('OtpLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  channelId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  channelType: {
    type: DataTypes.ENUM('whatsapp', 'email', 'sms'),
    allowNull: false,
  },
  // المستلم هو مستخدم نهائي تابع لموقع/تطبيق العميل (وليس طرف ثالث غير معروف)
  recipient: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  codeHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING,
    defaultValue: 'login_verification',
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'failed', 'verified', 'expired'),
    defaultValue: 'sent',
  },
  isTrialMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  verifiedAt: {
    type: DataTypes.DATE,
  },
  attemptCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'otp_logs',
  timestamps: true,
});

module.exports = OtpLog;
