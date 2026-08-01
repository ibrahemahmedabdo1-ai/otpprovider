const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * باكدجات التحقق: كل باكدج بيحدد عدد الرسائل والقناة (واتساب/إيميل/SMS/الكل)
 */
const Package = sequelize.define('Package', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  channelType: {
    type: DataTypes.ENUM('whatsapp', 'email', 'sms', 'all'),
    allowNull: false,
    defaultValue: 'all',
  },
  messageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD',
  },
  description: {
    type: DataTypes.TEXT,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'packages',
  timestamps: true,
});

module.exports = Package;
