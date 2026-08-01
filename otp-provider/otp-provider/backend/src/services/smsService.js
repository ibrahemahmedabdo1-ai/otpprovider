/**
 * خدمة إرسال رسائل SMS عبر Twilio (يمكن استبدالها بأي بوابة SMS محلية)
 */
const twilio = require('twilio');

async function sendSmsMessage({ channel, to, body }) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[SIMULATED SMS] To: ${to} | From: ${channel.identifier} | Body: ${body}`);
      return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      from: channel.identifier,
      to,
      body,
    });

    return { success: true, messageId: result.sid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkSmsHealth(channel) {
  const start = Date.now();
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return { status: 'healthy', latencyMs: Date.now() - start, note: 'وضع محاكاة - لا توجد مفاتيح Twilio' };
    }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'faulty', latencyMs: Date.now() - start, reason: err.message };
  }
}

module.exports = { sendSmsMessage, checkSmsHealth };
