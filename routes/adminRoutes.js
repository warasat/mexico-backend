const express = require('express');
const admin = require('../controllers/adminController');
const { requireAdmin } = require('../controllers/authAdminController');

const router = express.Router();

router.get('/admin/dashboard/stats', requireAdmin, admin.getDashboardStats);
router.get('/admin/dashboard/monthly-stats', requireAdmin, admin.getMonthlyStats);
router.get('/admin/dashboard/doctors', requireAdmin, admin.getDoctorsList);
router.get('/admin/dashboard/patients', requireAdmin, admin.getPatientsList);
router.get('/admin/dashboard/appointments', requireAdmin, admin.getAppointmentsList);

module.exports = router;


