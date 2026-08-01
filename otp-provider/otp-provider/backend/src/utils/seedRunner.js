const bcrypt = require('bcryptjs');
const { sequelize, StaffUser, Package, Channel } = require('../models');

async function runSeed() {
  const log = [];
  await sequelize.sync();

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
    log.push('Admin account created: ' + adminEmail + ' / ChangeMe123!');
  } else {
    log.push('Admin account already exists');
  }

  const packagesCount = await Package.count();
  if (packagesCount === 0) {
    await Package.bulkCreate([
      { name: 'Starter Package - WhatsApp', channelType: 'whatsapp', messageCount: 500, price: 20, description: '500 WhatsApp verification messages' },
      { name: 'Starter Package - Email', channelType: 'email', messageCount: 1000, price: 10, description: '1000 email verification messages' },
      { name: 'Starter Package - SMS', channelType: 'sms', messageCount: 300, price: 25, description: '300 SMS verification messages' },
      { name: 'Full Package', channelType: 'all', messageCount: 1000, price: 45, description: '1000 messages across all channels' },
    ]);
    log.push('Sample packages created');
  }

  const channelsCount = await Channel.count();
  if (channelsCount === 0) {
    await Channel.bulkCreate([
      { type: 'whatsapp', identifier: '+14155238886', provider: 'twilio', assignmentMode: 'shared', status: 'active' },
      { type: 'email', identifier: 'no-reply@otpprovider.com', provider: 'smtp', assignmentMode: 'shared', status: 'active' },
      { type: 'sms', identifier: '+1234567890', provider: 'twilio', assignmentMode: 'shared', status: 'active' },
    ]);
    log.push('Sample channels created');
  }

  return log;
}

module.exports = { runSeed };
