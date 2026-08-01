const express = require('express');
const router = express.Router();
const { staffLogin, clientLogin } = require('../controllers/authController');

router.post('/staff/login', staffLogin);
router.post('/client/login', clientLogin);

module.exports = router;
