const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * موديل العميل: صاحب الموقع/الشركة اللي بيستخدم الخدمة
 * للتحقق من مستخدمينه (OTP عبر واتساب/إيميل/SMS)
 */
const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
  },
  websiteUrl: {
    type: DataTypes.STRING,
  },
  apiKey: {
    type: DataTypes.STRING,
    unique: true,
  },
  apiSecret: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended'),
    defaultValue: 'pending',
  },
  // رصيد الرسائل المتبقي لكل نوع قناة
  balanceWhatsapp: { type: DataTypes.INTEGER, defaultValue: 0 },
  balanceEmail: { type: DataTypes.INTEGER, defaultValue: 0 },
  balanceSms: { type: DataTypes.INTEGER, defaultValue: 0 },
  // هل استلم الرسائل التجريبية العشرة عند أول شحنة
  trialMessagesGranted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdByStaffId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'clients',
  timestamps: true,
});

module.exports = Client;
