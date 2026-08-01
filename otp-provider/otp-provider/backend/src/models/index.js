const sequelize = require('../config/database');
const StaffUser = require('./StaffUser');
const Client = require('./Client');
const Package = require('./Package');
const Transaction = require('./Transaction');
const Channel = require('./Channel');
const OtpLog = require('./OtpLog');
const SupportChat = require('./SupportChat');
const FaultCheck = require('./FaultCheck');

// ===== العلاقات =====

// عميل <-> عمليات شحن
Client.hasMany(Transaction, { foreignKey: 'clientId', as: 'transactions' });
Transaction.belongsTo(Client, { foreignKey: 'clientId' });

// باكدج <-> عمليات شحن
Package.hasMany(Transaction, { foreignKey: 'packageId', as: 'transactions' });
Transaction.belongsTo(Package, { foreignKey: 'packageId' });

// عميل <-> سجلات OTP
Client.hasMany(OtpLog, { foreignKey: 'clientId', as: 'otpLogs' });
OtpLog.belongsTo(Client, { foreignKey: 'clientId' });

// قناة <-> سجلات OTP
Channel.hasMany(OtpLog, { foreignKey: 'channelId', as: 'otpLogs' });
OtpLog.belongsTo(Channel, { foreignKey: 'channelId' });

// عميل <-> قنوات مخصصة (dedicated)
Client.hasMany(Channel, { foreignKey: 'dedicatedClientId', as: 'dedicatedChannels' });
Channel.belongsTo(Client, { foreignKey: 'dedicatedClientId' });

// عميل <-> محادثات الدعم
Client.hasMany(SupportChat, { foreignKey: 'clientId', as: 'chats' });
SupportChat.belongsTo(Client, { foreignKey: 'clientId' });

// موظف <-> محادثات الدعم
StaffUser.hasMany(SupportChat, { foreignKey: 'staffId', as: 'chats' });
SupportChat.belongsTo(StaffUser, { foreignKey: 'staffId' });

// عميل <-> فحوصات الأعطال
Client.hasMany(FaultCheck, { foreignKey: 'clientId', as: 'faultChecks' });
FaultCheck.belongsTo(Client, { foreignKey: 'clientId' });

// موظف <-> فحوصات الأعطال
StaffUser.hasMany(FaultCheck, { foreignKey: 'checkedByStaffId', as: 'faultChecks' });
FaultCheck.belongsTo(StaffUser, { foreignKey: 'checkedByStaffId' });

// موظف <-> عمليات شحن قام بتنفيذها
StaffUser.hasMany(Transaction, { foreignKey: 'performedByStaffId', as: 'performedTransactions' });
Transaction.belongsTo(StaffUser, { foreignKey: 'performedByStaffId' });

module.exports = {
  sequelize,
  StaffUser,
  Client,
  Package,
  Transaction,
  Channel,
  OtpLog,
  SupportChat,
  FaultCheck,
};
