const crypto = require('crypto');
const { Transaction, Package, OtpLog, SupportChat } = require('../models');

async function getDashboard(req, res) {
  const client = req.client;
  res.json({
    client: {
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      status: client.status,
      apiKey: client.apiKey,
      balances: {
        whatsapp: client.balanceWhatsapp,
        email: client.balanceEmail,
        sms: client.balanceSms,
      },
    },
  });
}

async function getMyTransactions(req, res) {
  const transactions = await Transaction.findAll({
    where: { clientId: req.client.id },
    include: [{ model: Package }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ transactions });
}

async function getMyOtpLogs(req, res) {
  const logs = await OtpLog.findAll({
    where: { clientId: req.client.id },
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  res.json({ logs });
}

// إعادة توليد apiSecret (لو العميل حس إن مفتاحه اتسرب مثلاً)
async function regenerateApiSecret(req, res) {
  req.client.apiSecret = crypto.randomBytes(32).toString('hex');
  await req.client.save();
  res.json({ apiKey: req.client.apiKey, apiSecret: req.client.apiSecret });
}

// محادثة الدعم من طرف العميل
async function getMyChat(req, res) {
  const chats = await SupportChat.findAll({
    where: { clientId: req.client.id },
    order: [['createdAt', 'ASC']],
  });
  res.json({ chats });
}

async function sendMyChatMessage(req, res) {
  const { message } = req.body;
  const chat = await SupportChat.create({
    clientId: req.client.id,
    sender: 'client',
    message,
  });
  res.status(201).json({ chat });
}

module.exports = {
  getDashboard,
  getMyTransactions,
  getMyOtpLogs,
  regenerateApiSecret,
  getMyChat,
  sendMyChatMessage,
};
