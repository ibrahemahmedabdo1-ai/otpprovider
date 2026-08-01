const bcrypt = require('bcryptjs');
const { Channel, OtpLog } = require('../models');
const { sendWhatsappMessage } = require('./whatsappService');
const { sendEmailMessage } = require('./emailService');
const { sendSmsMessage } = require('./smsService');

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);

function generateNumericCode(length) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

/**
 * يختار القناة المناسبة لإرسال الرسالة:
 * أولاً يبحث عن قناة مخصصة (dedicated) لهذا العميل تحديدًا، وإلا يستخدم قناة مشتركة (shared) نشطة
 */
async function pickChannel(clientId, channelType) {
  let channel = await Channel.findOne({
    where: { type: channelType, assignmentMode: 'dedicated', dedicatedClientId: clientId, status: 'active' },
  });
  if (!channel) {
    channel = await Channel.findOne({
      where: { type: channelType, assignmentMode: 'shared', status: 'active' },
    });
  }
  return channel;
}

function getBalanceField(channelType) {
  return { whatsapp: 'balanceWhatsapp', email: 'balanceEmail', sms: 'balanceSms' }[channelType];
}

/**
 * إرسال كود تحقق (OTP) لعميل نهائي تابع لموقع/تطبيق العميل صاحب الحساب
 */
async function sendOtp({ client, channelType, recipient, purpose }) {
  const balanceField = getBalanceField(channelType);
  if (client[balanceField] <= 0) {
    return { success: false, error: 'الرصيد غير كافٍ لهذه القناة. برجاء شحن باكدج جديد.' };
  }

  const channel = await pickChannel(client.id, channelType);
  if (!channel) {
    return { success: false, error: `لا توجد قناة ${channelType} نشطة متاحة حاليًا` };
  }

  const code = generateNumericCode(OTP_LENGTH);
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  const body = `كود التحقق الخاص بك: ${code}\nصالح لمدة ${Math.floor(OTP_EXPIRY_SECONDS / 60)} دقائق. لا تشاركه مع أحد.`;

  let sendResult;
  if (channelType === 'whatsapp') {
    sendResult = await sendWhatsappMessage({ channel, to: recipient, body });
  } else if (channelType === 'email') {
    sendResult = await sendEmailMessage({ channel, to: recipient, subject: 'كود التحقق الخاص بك', body });
  } else {
    sendResult = await sendSmsMessage({ channel, to: recipient, body });
  }

  const log = await OtpLog.create({
    clientId: client.id,
    channelId: channel.id,
    channelType,
    recipient,
    codeHash,
    purpose: purpose || 'login_verification',
    status: sendResult.success ? 'sent' : 'failed',
    expiresAt,
  });

  if (sendResult.success) {
    client[balanceField] -= 1;
    await client.save();
  }

  return {
    success: sendResult.success,
    error: sendResult.error,
    otpId: log.id,
    expiresAt,
    // ملاحظة: الكود نفسه لا يُرجع أبدًا في الاستجابة، فقط يُرسل للمستلم مباشرة
  };
}

/**
 * التحقق من صحة كود OTP اللي أدخله المستخدم النهائي
 */
async function verifyOtp({ client, otpId, code }) {
  const log = await OtpLog.findOne({ where: { id: otpId, clientId: client.id } });
  if (!log) return { success: false, error: 'رمز التحقق غير موجود' };
  if (log.status === 'verified') return { success: false, error: 'تم استخدام هذا الكود من قبل' };
  if (new Date() > new Date(log.expiresAt)) {
    log.status = 'expired';
    await log.save();
    return { success: false, error: 'انتهت صلاحية الكود' };
  }
  if (log.attemptCount >= 5) {
    return { success: false, error: 'تم تجاوز عدد المحاولات المسموح بها' };
  }

  const isMatch = await bcrypt.compare(String(code), log.codeHash);
  log.attemptCount += 1;

  if (!isMatch) {
    await log.save();
    return { success: false, error: 'كود غير صحيح' };
  }

  log.status = 'verified';
  log.verifiedAt = new Date();
  await log.save();

  return { success: true };
}

module.exports = { sendOtp, verifyOtp, pickChannel };
