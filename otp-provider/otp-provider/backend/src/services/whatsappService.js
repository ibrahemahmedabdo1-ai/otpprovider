/**
 * خدمة إرسال رسائل واتساب
 * تستخدم Twilio WhatsApp API - يمكن استبدالها بأي مزوّد آخر (WhatsApp Business API الرسمي مثلاً)
 * المرسل (from) يُحدد حسب القناة (رقم واتساب) المرتبطة بالعميل من لوحة الأدمن
 */
const twilio = require('twilio');

async function sendWhatsappMessage({ channel, to, body }) {
  try {
    // في وضع التجربة (بدون مفاتيح Twilio حقيقية) نكتفي بمحاكاة الإرسال
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[SIMULATED WHATSAPP] To: ${to} | From: ${channel.identifier} | Body: ${body}`);
      return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      from: `whatsapp:${channel.identifier}`,
      to: `whatsapp:${to}`,
      body,
    });

    return { success: true, messageId: result.sid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * فحص صحة رقم واتساب المرتبط بالقناة (يُستخدم في زر "اكتشف العطل")
 */
async function checkWhatsappHealth(channel) {
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

module.exports = { sendWhatsappMessage, checkWhatsappHealth };
