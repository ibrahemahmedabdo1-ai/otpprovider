const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * موديل موظفي النظام: أدمن أو سبورت
 * الأدمن هو المتحكم الوحيد الكامل في النظام
 * السبورت له صلاحيات محددة يمنحها له الأدمن فقط
 */
const StaffUser = sequelize.define('StaffUser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
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
  role: {
    type: DataTypes.ENUM('admin', 'support'),
    allowNull: false,
    defaultValue: 'support',
  },
  // صلاحيات دقيقة يحددها الأدمن لكل سبورت
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      viewClients: true,       // مشاهدة بيانات العملاء
      chatWithClients: true,   // المحادثة مع العملاء
      shipPackages: false,     // شحن باكدجات للعملاء
      activateClients: false,  // تفعيل حسابات العملاء
      manageChannels: false,   // ربط أرقام/إيميلات جديدة
      diagnoseFaults: true,    // استخدام زر اكتشاف العطل
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'staff_users',
  timestamps: true,
});

module.exports = StaffUser;
