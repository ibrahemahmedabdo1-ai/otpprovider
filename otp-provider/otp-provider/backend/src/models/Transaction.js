const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * سجل عمليات الشحن (شراء الباكدجات) لكل عميل
 */
const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  packageId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('purchase', 'trial_grant', 'admin_adjustment'),
    defaultValue: 'purchase',
  },
  channelType: {
    type: DataTypes.ENUM('whatsapp', 'email', 'sms', 'all'),
    allowNull: false,
  },
  messageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  performedByStaffId: {
    type: DataTypes.UUID,
    allowNull: true, // null لو العميل شحن نفسه أونلاين
  },
  notes: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'transactions',
  timestamps: true,
});

module.exports = Transaction;
