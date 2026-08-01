const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * محادثة بين السبورت/الأدمن والعميل داخل بروفايل العميل
 */
const SupportChat = sequelize.define('SupportChat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  staffId: {
    type: DataTypes.UUID,
    allowNull: true, // null لو الرسالة من العميل نفسه
  },
  sender: {
    type: DataTypes.ENUM('client', 'staff'),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'support_chats',
  timestamps: true,
});

module.exports = SupportChat;
