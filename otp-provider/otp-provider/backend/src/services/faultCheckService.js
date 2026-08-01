const { Channel, FaultCheck } = require('../models');
const { checkWhatsappHealth } = require('./whatsappService');
const { checkEmailHealth } = require('./emailService');
const { checkSmsHealth } = require('./smsService');

/**
 * زر "اكتشف العطل": يفحص كل القنوات (المخصصة والمشتركة النشطة)
 * المتاحة لعميل معيّن ويرجع تقرير حالة شامل
 */
async function diagnoseClientChannels({ client, staffId }) {
  // القنوات المخصصة لهذا العميل + القنوات المشتركة النشطة (اللي ممكن يستخدمها العميل)
  const dedicatedChannels = await Channel.findAll({
    where: { dedicatedClientId: client.id, assignmentMode: 'dedicated' },
  });
  const sharedChannels = await Channel.findAll({
    where: { assignmentMode: 'shared', status: 'active' },
  });

  const channelsToCheck = [...dedicatedChannels, ...sharedChannels];
  const results = [];

  for (const channel of channelsToCheck) {
    let healthResult;
    if (channel.type === 'whatsapp') healthResult = await checkWhatsappHealth(channel);
    else if (channel.type === 'email') healthResult = await checkEmailHealth(channel);
    else healthResult = await checkSmsHealth(channel);

    results.push({
      channelId: channel.id,
      channelType: channel.type,
      identifier: channel.identifier,
      mode: channel.assignmentMode,
      ...healthResult,
    });

    // تحديث حالة القناة نفسها لو اتغيرت
    if (healthResult.status !== channel.status) {
      channel.status = healthResult.status === 'healthy' ? 'active' : 'faulty';
      channel.lastCheckedAt = new Date();
      await channel.save();
    }
  }

  // فحص إضافي: هل رصيد العميل كافٍ؟
  const balanceWarnings = [];
  if (client.balanceWhatsapp <= 0) balanceWarnings.push('رصيد الواتساب صفر');
  if (client.balanceEmail <= 0) balanceWarnings.push('رصيد الإيميل صفر');
  if (client.balanceSms <= 0) balanceWarnings.push('رصيد الـ SMS صفر');

  const hasFaulty = results.some(r => r.status === 'faulty');
  const overallStatus = hasFaulty ? 'faulty' : (balanceWarnings.length ? 'degraded' : 'healthy');

  const faultCheck = await FaultCheck.create({
    clientId: client.id,
    checkedByStaffId: staffId,
    results,
    overallStatus,
  });

  return {
    id: faultCheck.id,
    overallStatus,
    results,
    balanceWarnings,
    checkedAt: faultCheck.createdAt,
  };
}

module.exports = { diagnoseClientChannels };
