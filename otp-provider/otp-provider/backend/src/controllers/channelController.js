const { Channel } = require('../models');

async function listChannels(req, res) {
  const { type } = req.query;
  const where = {};
  if (type) where.type = type;
  const channels = await Channel.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json({ channels });
}

// ربط رقم واتساب/إيميل/بوابة SMS جديدة (الأدمن فقط)
async function createChannel(req, res) {
  try {
    const { type, identifier, provider, credentials, assignmentMode, dedicatedClientId } = req.body;
    const channel = await Channel.create({
      type,
      identifier,
      provider,
      credentials: credentials || {},
      assignmentMode: assignmentMode || 'shared',
      dedicatedClientId: assignmentMode === 'dedicated' ? dedicatedClientId : null,
      status: 'active',
    });
    res.status(201).json({ channel });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function updateChannel(req, res) {
  const channel = await Channel.findByPk(req.params.id);
  if (!channel) return res.status(404).json({ error: 'القناة غير موجودة' });
  await channel.update(req.body);
  res.json({ channel });
}

async function deleteChannel(req, res) {
  const channel = await Channel.findByPk(req.params.id);
  if (!channel) return res.status(404).json({ error: 'القناة غير موجودة' });
  await channel.destroy();
  res.json({ message: 'تم حذف القناة' });
}

module.exports = { listChannels, createChannel, updateChannel, deleteChannel };
