const { Client, Package, Transaction, sequelize } = require('../models');

const TRIAL_MESSAGES_ON_TOPUP = parseInt(process.env.TRIAL_MESSAGES_ON_TOPUP || '10', 10);

function getBalanceFields(channelType) {
  if (channelType === 'all') return ['balanceWhatsapp', 'balanceEmail', 'balanceSms'];
  return [{ whatsapp: 'balanceWhatsapp', email: 'balanceEmail', sms: 'balanceSms' }[channelType]];
}

/**
 * شحن باكدج لعميل (الأدمن، أو سبورت عنده صلاحية shipPackages)
 * عند أول شحنة للعميل، يحصل تلقائيًا على 10 رسائل اختبار مجانية موزعة على القنوات المتاحة
 */
async function shipPackage(req, res) {
  const t = await sequelize.transaction();
  try {
    const { clientId, packageId, notes } = req.body;

    const client = await Client.findByPk(clientId, { transaction: t });
    if (!client) {
      await t.rollback();
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const pkg = await Package.findByPk(packageId, { transaction: t });
    if (!pkg || !pkg.isActive) {
      await t.rollback();
      return res.status(404).json({ error: 'الباكدج غير موجود أو غير نشط' });
    }

    // إضافة رصيد الباكدج المشحون
    const fields = getBalanceFields(pkg.channelType);
    for (const field of fields) {
      client[field] += pkg.messageCount;
    }

    await Transaction.create({
      clientId: client.id,
      packageId: pkg.id,
      type: 'purchase',
      channelType: pkg.channelType,
      messageCount: pkg.messageCount,
      amountPaid: pkg.price,
      performedByStaffId: req.staff ? req.staff.id : null,
      notes,
    }, { transaction: t });

    // منح 10 رسائل اختبار عند أول عملية شحن فقط
    let trialGranted = false;
    if (!client.trialMessagesGranted) {
      client.balanceWhatsapp += TRIAL_MESSAGES_ON_TOPUP;
      client.balanceEmail += TRIAL_MESSAGES_ON_TOPUP;
      client.balanceSms += TRIAL_MESSAGES_ON_TOPUP;
      client.trialMessagesGranted = true;
      trialGranted = true;

      await Transaction.create({
        clientId: client.id,
        type: 'trial_grant',
        channelType: 'all',
        messageCount: TRIAL_MESSAGES_ON_TOPUP,
        amountPaid: 0,
        performedByStaffId: req.staff ? req.staff.id : null,
        notes: 'رسائل اختبار مجانية عند أول شحنة',
      }, { transaction: t });
    }

    // تفعيل العميل تلقائيًا لو أول شحنة له
    if (client.status === 'pending') {
      client.status = 'active';
    }

    await client.save({ transaction: t });
    await t.commit();

    res.json({
      client,
      trialGranted,
      message: trialGranted
        ? `تم الشحن بنجاح، وحصل العميل على ${TRIAL_MESSAGES_ON_TOPUP} رسائل اختبار مجانية`
        : 'تم الشحن بنجاح',
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
}

async function listClientTransactions(req, res) {
  const transactions = await Transaction.findAll({
    where: { clientId: req.params.clientId },
    include: [{ model: Package }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ transactions });
}

module.exports = { shipPackage, listClientTransactions };
