const nodemailer = require("nodemailer");

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASS to .env");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendVerificationEmail(to, name, token) {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${base.replace(/\/$/, "")}/verify-email.html?token=${encodeURIComponent(token)}`;
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "تأكيد البريد الإلكتروني - OTP Guard",
    text: `مرحبًا ${name || ""}\n\nأكد بريدك الإلكتروني من خلال الرابط التالي:\n${verifyUrl}\n\nالرابط صالح لمدة 30 دقيقة.`,
    html: `<p>مرحبًا ${name || ""}</p><p>اضغط على الرابط لتأكيد بريدك الإلكتروني:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>الرابط صالح لمدة 30 دقيقة.</p>`
  });
  return { ok: true, messageId: info.messageId };
}

module.exports = { sendVerificationEmail };
