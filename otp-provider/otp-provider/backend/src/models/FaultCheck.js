const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * سجل نتائج زر "اكتشف العطل" - يفحص حالة قنوات إرسال العميل
 * (هل الرقم/الإيميل المرتبط بالعميل شغال، فيه تأخير، أو معطل)
 */
const FaultCheck = sequelize.define('FaultCheck', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  checkedByStaffId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // نتيجة الفحص لكل قناة مرتبطة بالعميل
  results: {
    type: DataTypes.JSON,
    defaultValue: [],
    /* مثال:
      [
        { channelType: 'whatsapp', identifier: '+201234567', status: 'healthy', latencyMs: 320 },
        { channelType: 'email', identifier: 'smtp1', status: 'faulty', reason: 'SMTP auth failed' }
      ]
    */
  },
  overallStatus: {
    type: DataTypes.ENUM('healthy', 'degraded', 'faulty'),
    defaultValue: 'healthy',
  },
}, {
  tableName: 'fault_checks',
  timestamps: true,
});

module.exports = FaultCheck;
