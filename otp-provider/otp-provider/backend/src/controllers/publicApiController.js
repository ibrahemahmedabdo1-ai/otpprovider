const { sendOtp, verifyOtp } = require('../services/otpService');

// POST /api/v1/otp/send
async function send(req, res) {
  try {
    const { channel, recipient, purpose } = req.body;
    if (!['whatsapp', 'email', 'sms'].includes(channel)) {
      return res.status(400).json({ error: 'channel يجب أن يكون whatsapp أو email أو sms' });
    }
    if (!recipient) {
      return res.status(400).json({ error: 'recipient مطلوب' });
    }

    const result = await sendOtp({ client: req.client, channelType: channel, recipient, purpose });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      otpId: result.otpId,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال رمز التحقق' });
  }
}

// POST /api/v1/otp/verify
async function verify(req, res) {
  try {
    const { otpId, code } = req.body;
    if (!otpId || !code) {
      return res.status(400).json({ error: 'otpId و code مطلوبان' });
    }
    const result = await verifyOtp({ client: req.client, otpId, code });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, verified: true });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء التحقق من الرمز' });
  }
}

module.exports = { send, verify };
