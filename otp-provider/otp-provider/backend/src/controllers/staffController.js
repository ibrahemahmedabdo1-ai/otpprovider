const bcrypt = require('bcryptjs');
const { StaffUser } = require('../models');

// عرض كل موظفي الدعم (السبورت) - الأدمن فقط
async function listStaff(req, res) {
  const staff = await StaffUser.findAll({
    where: { role: 'support' },
    attributes: { exclude: ['password'] },
    order: [['createdAt', 'DESC']],
  });
  res.json({ staff });
}

// إنشاء حساب سبورت جديد بصلاحيات محددة
async function createStaff(req, res) {
  try {
    const { name, email, password, permissions } = req.body;
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'));

    const staff = await StaffUser.create({
      name,
      email,
      password: hashedPassword,
      role: 'support',
      permissions: permissions || undefined, // لو مش متبعتة هتاخد القيم الافتراضية
    });

    const { password: _, ...staffData } = staff.toJSON();
    res.status(201).json({ staff: staffData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// تعديل صلاحيات سبورت معيّن
async function updateStaffPermissions(req, res) {
  const staff = await StaffUser.findByPk(req.params.id);
  if (!staff || staff.role !== 'support') {
    return res.status(404).json({ error: 'حساب السبورت غير موجود' });
  }
  staff.permissions = { ...staff.permissions, ...req.body.permissions };
  await staff.save();
  res.json({ staff: { id: staff.id, permissions: staff.permissions } });
}

// تفعيل / إيقاف حساب سبورت
async function toggleStaffActive(req, res) {
  const staff = await StaffUser.findByPk(req.params.id);
  if (!staff || staff.role !== 'support') {
    return res.status(404).json({ error: 'حساب السبورت غير موجود' });
  }
  staff.isActive = req.body.isActive;
  await staff.save();
  res.json({ staff: { id: staff.id, isActive: staff.isActive } });
}

module.exports = { listStaff, createStaff, updateStaffPermissions, toggleStaffActive };
