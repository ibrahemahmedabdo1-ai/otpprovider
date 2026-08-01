const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { StaffUser, Client } = require('../models');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// تسجيل دخول الأدمن أو السبورت
async function staffLogin(req, res) {
  try {
    const { email, password } = req.body;
    const staff = await StaffUser.findOne({ where: { email } });
    if (!staff || !staff.isActive) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    const match = await bcrypt.compare(password, staff.password);
    if (!match) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const token = signToken({ id: staff.id, type: 'staff', role: staff.role });
    res.json({
      token,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
}

// تسجيل دخول العميل (صاحب الموقع) للوحته الخاصة
async function clientLogin(req, res) {
  try {
    const { email, password } = req.body;
    const client = await Client.findOne({ where: { email } });
    if (!client) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    const match = await bcrypt.compare(password, client.password);
    if (!match) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    if (client.status === 'suspended') {
      return res.status(403).json({ error: 'الحساب موقوف، تواصل مع الدعم' });
    }

    const token = signToken({ id: client.id, type: 'client' });
    res.json({
      token,
      client: {
        id: client.id,
        companyName: client.companyName,
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
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
}

module.exports = { staffLogin, clientLogin };
