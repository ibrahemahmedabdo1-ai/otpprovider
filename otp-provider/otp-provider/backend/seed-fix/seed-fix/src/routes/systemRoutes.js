const express = require('express');
const router = express.Router();
const { runSeed } = require('../utils/seedRunner');

/**
 * GET /api/system/seed?secret=xxx
 * ينشئ أول حساب أدمن + باكدجات وقنوات تجريبية
 * محمي بمفتاح سري (SEED_SECRET) عشان محدش تاني يقدر يستدعيه غيرك
 * استخدمه مرة واحدة بس بعد أول نشر، بعدين احذف المتغير SEED_SECRET من الإعدادات
 */
router.get('/seed', async (req, res) => {
  try {
    const providedSecret = req.query.secret || req.headers['x-seed-secret'];

    if (!process.env.SEED_SECRET) {
      return res.status(403).json({ error: 'SEED_SECRET غير مُعرّف في متغيرات البيئة، أضفه أولاً' });
    }
    if (!providedSecret || providedSecret !== process.env.SEED_SECRET) {
      return res.status(401).json({ error: 'مفتاح السر غير صحيح' });
    }

    const log = await runSeed();
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: 'فشل تنفيذ الـ Seed', details: err.message });
  }
});

module.exports = router;
