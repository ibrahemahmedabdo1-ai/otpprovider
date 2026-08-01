const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/auth');
const otpController = require('../controllers/publicApiController');
const rateLimit = require('express-rate-limit');

// حماية بسيطة من إساءة الاستخدام
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 طلب في الدقيقة لكل IP
  message: { error: 'عدد كبير من الطلبات، حاول لاحقًا' },
});

router.use(authenticateApiKey);
router.post('/otp/send', otpLimiter, otpController.send);
router.post('/otp/verify', otpLimiter, otpController.verify);

module.exports = router;
