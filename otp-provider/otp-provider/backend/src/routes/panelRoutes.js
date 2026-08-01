const express = require('express');
const router = express.Router();
const { authenticateStaff, requirePermission } = require('../middleware/auth');
const clientMgmt = require('../controllers/clientManagementController');
const transactionController = require('../controllers/transactionController');
const packageController = require('../controllers/packageController');

router.use(authenticateStaff);

// عرض العملاء (بالاسم أو الإيميل) - يحتاج صلاحية viewClients
router.get('/clients', requirePermission('viewClients'), clientMgmt.listClients);
router.get('/clients/:id', requirePermission('viewClients'), clientMgmt.getClientProfile);
router.post('/clients', requirePermission('viewClients'), clientMgmt.createClient);
router.patch('/clients/:id/status', requirePermission('activateClients'), clientMgmt.updateClientStatus);

// زر اكتشف العطل داخل بروفايل العميل
router.post('/clients/:id/diagnose', requirePermission('diagnoseFaults'), clientMgmt.diagnoseFault);

// محادثة الدعم مع العميل
router.get('/clients/:id/chat', requirePermission('chatWithClients'), clientMgmt.getClientChat);
router.post('/clients/:id/chat', requirePermission('chatWithClients'), clientMgmt.sendChatMessage);

// شحن باكدج للعميل - يحتاج صلاحية shipPackages
router.post('/transactions/ship', requirePermission('shipPackages'), transactionController.shipPackage);
router.get('/clients/:clientId/transactions', requirePermission('viewClients'), transactionController.listClientTransactions);

// عرض الباكدجات المتاحة (للاختيار عند الشحن)
router.get('/packages', packageController.listPackages);

module.exports = router;
