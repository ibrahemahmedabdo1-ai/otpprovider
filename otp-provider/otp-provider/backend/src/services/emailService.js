/**
 * خدمة إرسال رسائل التحقق عبر البريد الإلكتروني
 * تستخدم nodemailer مع أي حساب SMTP يربطه الأدمن كقناة
 */
const nodemailer = require('nodemailer');

function buildTransport(channel) {
  const creds = channel.credentials || {};
  return nodemailer.createTransport({
    host: creds.smtpHost || process.env.SMTP_HOST,
    port: creds.smtpPort || process.env.SMTP_PORT,
    secure: (creds.smtpPort || process.env.SMTP_PORT) == 465,
    auth: {
      user: creds.smtpUser || process.env.SMTP_USER,
      pass: creds.smtpPassword || process.env.SMTP_PASSWORD,
    },
  });
}

async function sendEmailMessage({ channel, to, subject, body }) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log(`[SIMULATED EMAIL] To: ${to} | From: ${channel.identifier} | Subject: ${subject} | Body: ${body}`);
      return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
    }

    const transporter = buildTransport(channel);
    const info = await transporter.sendMail({
      from: channel.identifier,
      to,
      subject,
      text: body,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * فحص صحة حساب الإيميل المرتبط بالقناة (زر "اكتشف العطل")
 */
async function checkEmailHealth(channel) {
  const start = Date.now();
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return { status: 'healthy', latencyMs: Date.now() - start, note: 'وضع محاكاة - لا توجد بيانات SMTP' };
    }
    const transporter = buildTransport(channel);
    await transporter.verify();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'faulty', latencyMs: Date.now() - start, reason: err.message };
  }
}

module.exports = { sendEmailMessage, checkEmailHealth };
