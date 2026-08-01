const express = require('express');
const router = express.Router();
const { authenticateStaff, requireAdmin } = require('../middleware/auth');
const staffController = require('../controllers/staffController');
const packageController = require('../controllers/packageController');
const channelController = require('../controllers/channelController');

// كل الراوتس هنا للأدمن فقط
router.use(authenticateStaff, requireAdmin);

// إدارة حسابات السبورت وصلاحياتهم
router.get('/staff', staffController.listStaff);
router.post('/staff', staffController.createStaff);
router.patch('/staff/:id/permissions', staffController.updateStaffPermissions);
router.patch('/staff/:id/active', staffController.toggleStaffActive);

// إدارة الباكدجات
router.get('/packages', packageController.listPackages);
router.post('/packages', packageController.createPackage);
router.patch('/packages/:id', packageController.updatePackage);
router.delete('/packages/:id', packageController.deletePackage);

// إدارة القنوات (ربط أرقام واتساب/إيميلات/SMS جديدة)
router.get('/channels', channelController.listChannels);
router.post('/channels', channelController.createChannel);
router.patch('/channels/:id', channelController.updateChannel);
router.delete('/channels/:id', channelController.deleteChannel);

module.exports = router;
