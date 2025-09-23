const express = require('express');
const admin = require('../controllers/adminController');

const router = express.Router();

router.get('/admin/dashboard/stats', admin.getDashboardStats);
router.get('/admin/dashboard/monthly-stats', admin.getMonthlyStats);
router.get('/admin/dashboard/doctors', admin.getDoctorsList);
router.get('/admin/dashboard/patients', admin.getPatientsList);
router.get('/admin/dashboard/appointments', admin.getAppointmentsList);

module.exports = router;


