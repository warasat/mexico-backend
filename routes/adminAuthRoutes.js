const express = require('express');
const { login, requireAdmin } = require('../controllers/authAdminController');

const router = express.Router();

// POST /api/admin/login
router.post('/admin/login', login);

module.exports = router;


