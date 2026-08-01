const { Package } = require('../models');

async function listPackages(req, res) {
  const packages = await Package.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ packages });
}

async function createPackage(req, res) {
  try {
    const { name, channelType, messageCount, price, currency, description } = req.body;
    const pkg = await Package.create({ name, channelType, messageCount, price, currency, description });
    res.status(201).json({ package: pkg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function updatePackage(req, res) {
  const pkg = await Package.findByPk(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'الباكدج غير موجود' });
  await pkg.update(req.body);
  res.json({ package: pkg });
}

async function deletePackage(req, res) {
  const pkg = await Package.findByPk(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'الباكدج غير موجود' });
  await pkg.update({ isActive: false });
  res.json({ message: 'تم إيقاف الباكدج' });
}

module.exports = { listPackages, createPackage, updatePackage, deletePackage };
