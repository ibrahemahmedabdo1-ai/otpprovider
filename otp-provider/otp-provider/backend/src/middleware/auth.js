const jwt = require('jsonwebtoken');
const { StaffUser, Client } = require('../models');

/**
 * توثيق الموظفين (أدمن/سبورت) عن طريق JWT
 */
async function authenticateStaff(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'التوثيق مطلوب' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'staff') {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const staff = await StaffUser.findByPk(decoded.id);
    if (!staff || !staff.isActive) {
      return res.status(401).json({ error: 'الحساب غير موجود أو موقوف' });
    }

    req.staff = staff;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
}

/**
 * يسمح فقط للأدمن
 */
function requireAdmin(req, res, next) {
  if (req.staff.role !== 'admin') {
    return res.status(403).json({ error: 'هذا الإجراء متاح للأدمن فقط' });
  }
  next();
}

/**
 * يتحقق من صلاحية معينة عند السبورت (الأدمن دايمًا مسموح له بكل شيء)
 */
function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (req.staff.role === 'admin') return next();
    const permissions = req.staff.permissions || {};
    if (!permissions[permissionKey]) {
      return res.status(403).json({ error: 'لا تملك صلاحية تنفيذ هذا الإجراء. تواصل مع الأدمن.' });
    }
    next();
  };
}

/**
 * توثيق العملاء (أصحاب المواقع) لدخول لوحتهم الخاصة
 */
async function authenticateClient(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'التوثيق مطلوب' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const client = await Client.findByPk(decoded.id);
    if (!client || client.status === 'suspended') {
      return res.status(401).json({ error: 'الحساب غير موجود أو موقوف' });
    }

    req.client = client;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
}

/**
 * توثيق طلبات API الخاصة بإرسال/تأكيد OTP عبر apiKey + apiSecret
 * (ده اللي هيستخدمه موقع العميل نفسه من السيرفر بتاعه، زي Twilio API Key)
 */
async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (!apiKey || !apiSecret) {
      return res.status(401).json({ error: 'مطلوب X-API-Key و X-API-Secret' });
    }

    const client = await Client.findOne({ where: { apiKey } });
    if (!client || client.apiSecret !== apiSecret) {
      return res.status(401).json({ error: 'بيانات API غير صحيحة' });
    }
    if (client.status !== 'active') {
      return res.status(403).json({ error: 'حساب العميل غير مفعّل' });
    }

    req.client = client;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'خطأ في التوثيق' });
  }
}

module.exports = {
  authenticateStaff,
  requireAdmin,
  requirePermission,
  authenticateClient,
  authenticateApiKey,
};
