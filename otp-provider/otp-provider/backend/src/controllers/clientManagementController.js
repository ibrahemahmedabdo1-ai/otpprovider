const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Client, Transaction, Package, OtpLog, SupportChat } = require('../models');
const { diagnoseClientChannels } = require('../services/faultCheckService');

function generateApiKeyPair() {
  return {
    apiKey: `otp_${crypto.randomBytes(16).toString('hex')}`,
    apiSecret: crypto.randomBytes(32).toString('hex'),
  };
}

// عرض كل العملاء (متاح للأدمن والسبورت اللي عنده صلاحية viewClients)
async function listClients(req, res) {
  const { search, status } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) {
    const { Op } = require('sequelize');
    where[Op.or] = [
      { companyName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { contactName: { [Op.like]: `%${search}%` } },
    ];
  }
  const clients = await Client.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json({ clients });
}

// عرض بروفايل عميل بالتفصيل (بحث بالاسم أو الإيميل، وكل عملياته)
async function getClientProfile(req, res) {
  const client = await Client.findByPk(req.params.id, {
    include: [
      { model: Transaction, as: 'transactions', include: [{ model: Package }] },
      { model: OtpLog, as: 'otpLogs', limit: 50, order: [['createdAt', 'DESC']] },
    ],
  });
  if (!client) return res.status(404).json({ error: 'العميل غير موجود' });
  res.json({ client });
}

// إنشاء عميل جديد (الأدمن أو سبورت له صلاحية)
async function createClient(req, res) {
  try {
    const { companyName, contactName, email, password, phone, websiteUrl } = req.body;
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'));
    const { apiKey, apiSecret } = generateApiKeyPair();

    const client = await Client.create({
      companyName,
      contactName,
      email,
      password: hashedPassword,
      phone,
      websiteUrl,
      apiKey,
      apiSecret,
      status: 'pending',
      createdByStaffId: req.staff.id,
    });

    res.status(201).json({ client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// تفعيل / تعليق حساب عميل
async function updateClientStatus(req, res) {
  const { status } = req.body; // active | suspended | pending
  const client = await Client.findByPk(req.params.id);
  if (!client) return res.status(404).json({ error: 'العميل غير موجود' });
  client.status = status;
  await client.save();
  res.json({ client });
}

// اكتشف العطل - متاح داخل بروفايل العميل للأدمن والسبورت (بصلاحية diagnoseFaults)
async function diagnoseFault(req, res) {
  const client = await Client.findByPk(req.params.id);
  if (!client) return res.status(404).json({ error: 'العميل غير موجود' });

  const report = await diagnoseClientChannels({ client, staffId: req.staff.id });
  res.json({ report });
}

// محادثة الدعم الخاصة بالعميل - جلب الرسائل
async function getClientChat(req, res) {
  const chats = await SupportChat.findAll({
    where: { clientId: req.params.id },
    order: [['createdAt', 'ASC']],
  });
  res.json({ chats });
}

// إرسال رسالة للعميل من طرف الموظف
async function sendChatMessage(req, res) {
  const { message } = req.body;
  const chat = await SupportChat.create({
    clientId: req.params.id,
    staffId: req.staff.id,
    sender: 'staff',
    message,
  });
  res.status(201).json({ chat });
}

module.exports = {
  listClients,
  getClientProfile,
  createClient,
  updateClientStatus,
  diagnoseFault,
  getClientChat,
  sendChatMessage,
};
